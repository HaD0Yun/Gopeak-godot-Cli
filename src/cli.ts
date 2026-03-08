#!/usr/bin/env node

import { access, cp, mkdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Command } from 'commander';
import { registry } from './registry/index.js';
import { executeHeadless } from './engine/headless.js';
import { executeRuntime } from './engine/runtime.js';
import { executeLSP } from './engine/lsp.js';
import { executeDAP } from './engine/dap.js';
import { startDaemon, stopDaemon, getDaemonStatus } from './daemon/dap-daemon.js';
import { checkForUpdates } from './cli/check.js';
import { showNotification } from './cli/notify.js';
import { setupShellHooks } from './cli/setup.js';
import { starGodotFlow } from './cli/star.js';
import { uninstallHooks } from './cli/uninstall.js';
import { getLocalVersion } from './cli/utils.js';
import { APP_VERSION } from './version.js';
import { CONFIG_ENV_KEYS, loadConfig } from './config.js';
import { GodotFlowError } from './errors.js';
import type { ExecutionResult } from './types/engine.js';
import type { FunctionDefinition } from './types/function.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
  throw error;
});

interface GlobalOptions {
  format?: string;
  timeout?: string;
  projectPath?: string;
}

interface CliContext {
  format: 'json' | 'text';
  timeoutMs?: number;
  projectPath?: string;
}

interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
}

interface DoctorReport {
  summary: {
    passed: number;
    warned: number;
    failed: number;
  };
  checks: DoctorCheck[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseContext(command: Command): CliContext {
  const options = command.optsWithGlobals<GlobalOptions>();
  const normalizedFormat = (options.format ?? 'json').trim().toLowerCase();

  if (normalizedFormat !== 'json' && normalizedFormat !== 'text') {
    throw new GodotFlowError('INVALID_ARGS', `Invalid format: ${options.format ?? ''}`, {
      allowed: ['json', 'text'],
      received: options.format,
    });
  }

  let timeoutMs: number | undefined;
  if (options.timeout !== undefined) {
    const parsed = Number.parseInt(options.timeout, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new GodotFlowError('INVALID_ARGS', 'Timeout must be a positive integer in milliseconds', {
        received: options.timeout,
      });
    }
    timeoutMs = parsed;
  }

  return {
    format: normalizedFormat,
    timeoutMs,
    projectPath: options.projectPath,
  };
}

function tryGetFormat(command?: Command): 'json' | 'text' {
  if (!command) {
    return 'json';
  }

  const options = command.optsWithGlobals<GlobalOptions>();
  const normalizedFormat = (options.format ?? 'json').trim().toLowerCase();
  return normalizedFormat === 'text' ? 'text' : 'json';
}

function serializeCell(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function printTable(rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    process.stdout.write('No results\n');
    return;
  }

  const columns = Object.keys(rows[0]);
  const widths = columns.map((column) => {
    const maxContentLength = rows.reduce((max, row) => {
      return Math.max(max, serializeCell(row[column]).length);
    }, column.length);
    return maxContentLength;
  });

  const renderRow = (row: Record<string, unknown>): string => {
    return columns
      .map((column, index) => serializeCell(row[column]).padEnd(widths[index]))
      .join('  ');
  };

  const headerRow = columns.reduce<Record<string, unknown>>((acc, column) => {
    acc[column] = column;
    return acc;
  }, {});

  process.stdout.write(`${renderRow(headerRow)}\n`);
  process.stdout.write(`${widths.map((width) => '-'.repeat(width)).join('  ')}\n`);
  for (const row of rows) {
    process.stdout.write(`${renderRow(row)}\n`);
  }
}

function outputSuccess(command: Command, payload: unknown): void {
  const context = parseContext(command);
  if (context.format === 'json') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  if (Array.isArray(payload) && payload.every((item) => isRecord(item))) {
    printTable(payload as Array<Record<string, unknown>>);
    return;
  }

  if (isRecord(payload)) {
    printTable([payload]);
    return;
  }

  process.stdout.write(`${String(payload)}\n`);
}

function outputError(command: Command | undefined, error: unknown): void {
  const normalized = error instanceof GodotFlowError
    ? error
    : new GodotFlowError('EXECUTION_FAILED', error instanceof Error ? error.message : String(error));

  const format = tryGetFormat(command);

  if (format === 'json') {
    process.stderr.write(`${JSON.stringify(normalized.toJSON(), null, 2)}\n`);
    return;
  }

  process.stderr.write(`[${normalized.code}] ${normalized.message}\n`);
  if (normalized.details) {
    process.stderr.write(`${JSON.stringify(normalized.details, null, 2)}\n`);
  }
}

async function parseExecArgs(rawArgs?: string, argsFile?: string): Promise<Record<string, unknown>> {
  if (rawArgs && argsFile) {
    throw new GodotFlowError('INVALID_ARGS', 'Use either --args or --args-file, not both at once');
  }

  let payload = rawArgs;
  if (argsFile) {
    payload = await readFile(argsFile, 'utf8');
  }

  if (!payload) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new GodotFlowError('INVALID_ARGS', 'Failed to parse --args as JSON', {
      args: payload,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (!isRecord(parsed)) {
    throw new GodotFlowError('INVALID_ARGS', 'The --args payload must be a JSON object', {
      args: payload,
    });
  }

  return parsed;
}

function resolveFunctionOrThrow(name: string): FunctionDefinition {
  const definition = registry.get(name);
  if (!definition) {
    throw new GodotFlowError('FUNCTION_NOT_FOUND', `Function not found: ${name}`, {
      name,
    });
  }
  return definition;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function checkCommandAvailability(command: string): { ok: boolean; output: string } {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    shell: false,
  });

  if (result.status === 0) {
    return {
      ok: true,
      output: (result.stdout || result.stderr || '').trim(),
    };
  }

  return {
    ok: false,
    output: (result.stderr || result.stdout || '').trim(),
  };
}

async function createDoctorReport(command: Command): Promise<DoctorReport> {
  const context = parseContext(command);
  const config = loadConfig({
    projectPath: context.projectPath,
    timeoutMs: context.timeoutMs,
  });

  const checks: DoctorCheck[] = [];

  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  checks.push({
    name: 'node',
    status: nodeMajor >= 18 ? 'pass' : 'fail',
    message: nodeMajor >= 18 ? `Node.js ${process.versions.node}` : `Node.js ${process.versions.node} (requires >=18)`,
    details: { version: process.versions.node },
  });

  const godotCheck = checkCommandAvailability(config.godotPath);
  checks.push({
    name: 'godot',
    status: godotCheck.ok ? 'pass' : 'warn',
    message: godotCheck.ok
      ? `Godot executable available: ${config.godotPath}`
      : `Godot executable not found or not runnable: ${config.godotPath}`,
    details: { configuredPath: config.godotPath, output: godotCheck.output },
  });

  if (config.projectPath) {
    const projectExists = await pathExists(config.projectPath);
    const projectFileExists = projectExists && await pathExists(resolve(config.projectPath, 'project.godot'));
    checks.push({
      name: 'projectPath',
      status: projectFileExists ? 'pass' : 'warn',
      message: projectFileExists
        ? `Godot project detected: ${config.projectPath}`
        : `Project path is missing or does not contain project.godot: ${config.projectPath}`,
      details: { projectPath: config.projectPath },
    });
  } else {
    checks.push({
      name: 'projectPath',
      status: 'warn',
      message: `No project path configured. Set ${CONFIG_ENV_KEYS.projectPath} or pass --project-path.`,
      details: { envKey: CONFIG_ENV_KEYS.projectPath },
    });
  }

  const codexSkillTarget = resolve(process.cwd(), '.codex/skills/gopeak-cli/SKILL.md');
  const claudeSkillTarget = resolve(process.cwd(), '.claude/skills/gopeak-cli/SKILL.md');
  const opencodeSkillTarget = resolve(process.cwd(), 'SKILL.md');

  checks.push({
    name: 'skills',
    status: (await pathExists(codexSkillTarget)) || (await pathExists(claudeSkillTarget)) || (await pathExists(opencodeSkillTarget))
      ? 'pass'
      : 'warn',
    message: 'AI skill files are optional but recommended for assistant integration.',
    details: {
      codex: codexSkillTarget,
      claude: claudeSkillTarget,
      opencode: opencodeSkillTarget,
    },
  });

  const passed = checks.filter((check) => check.status === 'pass').length;
  const warned = checks.filter((check) => check.status === 'warn').length;
  const failed = checks.filter((check) => check.status === 'fail').length;

  return {
    summary: { passed, warned, failed },
    checks,
  };
}

function createConfigView(command: Command): Record<string, unknown> {
  const context = parseContext(command);
  const config = loadConfig({
    projectPath: context.projectPath,
    timeoutMs: context.timeoutMs,
  });

  return {
    config,
    envKeys: CONFIG_ENV_KEYS,
    hints: {
      quickstart: [
        'gopeak-cli doctor --format text',
        'gopeak-cli listfunc --category scene --format text',
        'gopeak-cli findfunc project --format text',
      ],
    },
  };
}

async function routeExecution(
  definition: FunctionDefinition,
  args: Record<string, unknown>,
  command: Command,
): Promise<ExecutionResult> {
  const context = parseContext(command);
  const argProjectPath = typeof args.projectPath === 'string' ? args.projectPath : undefined;
  const config = loadConfig({
    projectPath: context.projectPath ?? argProjectPath,
    timeoutMs: context.timeoutMs,
  });

  switch (definition.executionPath) {
    case 'headless':
      return executeHeadless(definition.name, args, {
        projectPath: config.projectPath,
        timeoutMs: config.timeoutMs,
        godotPath: config.godotPath,
      });
    case 'runtime':
      return executeRuntime(definition.name, args, {
        projectPath: config.projectPath,
        timeoutMs: config.timeoutMs,
        host: '127.0.0.1',
        port: config.runtimePort,
      });
    case 'lsp':
      return executeLSP(definition.name, args, {
        projectPath: config.projectPath,
        timeoutMs: config.timeoutMs,
        host: '127.0.0.1',
        port: config.lspPort,
      });
    case 'dap':
      return executeDAP(definition.name, args, {
        projectPath: config.projectPath,
        timeoutMs: config.timeoutMs,
        host: '127.0.0.1',
        port: config.dapPort,
      });
    default:
      throw new GodotFlowError('REGISTRY_ERROR', `Unsupported execution path: ${definition.executionPath}`, {
        executionPath: definition.executionPath,
        functionName: definition.name,
      });
  }
}

async function copySkill(platform: string): Promise<{ platform: string; source: string; target: string }> {
  const normalizedPlatform = platform.trim().toLowerCase();
  let source: string;

  let target: string;
  if (normalizedPlatform === 'opencode') {
    source = resolve(__dirname, '../skills/opencode/SKILL.md');
    target = resolve(process.cwd(), 'SKILL.md');
  } else if (normalizedPlatform === 'claude' || normalizedPlatform === 'claudecode') {
    source = resolve(__dirname, '../skills/claude/SKILL.md');
    target = resolve(process.cwd(), '.claude/skills/gopeak-cli/SKILL.md');
  } else if (normalizedPlatform === 'codex') {
    source = resolve(__dirname, '../skills/codex/SKILL.md');
    target = resolve(process.cwd(), '.codex/skills/gopeak-cli/SKILL.md');
  } else {
    throw new GodotFlowError('INVALID_ARGS', `Unsupported platform: ${platform}`, {
      allowed: ['opencode', 'claude', 'claudecode', 'codex'],
    });
  }

  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { force: true });

  return {
    platform: normalizedPlatform,
    source,
    target,
  };
}

async function withHandling(command: Command, action: () => Promise<unknown>): Promise<void> {
  try {
    const result = await action();
    outputSuccess(command, result);
  } catch (error) {
    outputError(command, error);
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name('gopeak-cli')
  .version(APP_VERSION)
  .description('CLI-first Godot automation for humans and AI agents')
  .option('--format <type>', 'Output format (json|text)', 'json')
  .option('--timeout <ms>', 'Timeout in ms')
  .option('--project-path <path>', 'Godot project path');

program
  .command('doctor')
  .description('Check whether your CLI environment is ready to use')
  .action(async function doctorAction(this: Command) {
    await withHandling(this, async () => createDoctorReport(this));
  });

program
  .command('config')
  .description('Show resolved configuration and related environment keys')
  .action(async function configAction(this: Command) {
    await withHandling(this, async () => createConfigView(this));
  });

program
  .command('listfunc')
  .description('List available functions')
  .option('--category <cat>', 'Filter by category')
  .action(async function listfuncAction(this: Command, options: { category?: string }) {
    await withHandling(this, async () => {
      return registry.list(options.category);
    });
  });

program
  .command('findfunc <pattern>')
  .description('Find functions by pattern')
  .option('--category <cat>', 'Filter by category')
  .action(async function findfuncAction(this: Command, pattern: string, options: { category?: string }) {
    await withHandling(this, async () => {
      return registry.search(pattern, options.category);
    });
  });

program
  .command('viewfunc <name>')
  .description('View function details')
  .action(async function viewfuncAction(this: Command, name: string) {
    await withHandling(this, async () => {
      return resolveFunctionOrThrow(name);
    });
  });

program
  .command('exec <name>')
  .description('Execute a function')
  .option('--args <json>', 'JSON args')
  .option('--args-file <path>', 'Read JSON args from a file')
  .action(async function execAction(this: Command, name: string, options: { args?: string; argsFile?: string }) {
    await withHandling(this, async () => {
      const definition = resolveFunctionOrThrow(name);
      const args = await parseExecArgs(options.args, options.argsFile);
      const result = await routeExecution(definition, args, this);

      if (!result.success) {
        const errorCode = result.error?.code ?? 'EXECUTION_FAILED';
        const message = result.error?.message ?? `Function execution failed: ${name}`;
        const details = isRecord(result.error?.details)
          ? {
            ...result.error.details,
            function: name,
            durationMs: result.durationMs,
          }
          : {
            details: result.error?.details,
            function: name,
            durationMs: result.durationMs,
          };

        throw new GodotFlowError('EXECUTION_FAILED', message, {
          code: errorCode,
          ...details,
        });
      }

      return result;
    });
  });

const daemon = program.command('daemon').description('Manage DAP daemon');

daemon
  .command('start')
  .description('Start daemon')
  .action(async function daemonStartAction(this: Command) {
    await withHandling(this, async () => {
      const context = parseContext(this);
      const config = loadConfig({
        projectPath: context.projectPath,
        timeoutMs: context.timeoutMs,
      });

      return startDaemon({
        projectPath: config.projectPath,
        timeoutMs: config.timeoutMs,
        host: '127.0.0.1',
        port: config.dapPort,
      });
    });
  });

daemon
  .command('stop')
  .description('Stop daemon')
  .action(async function daemonStopAction(this: Command) {
    await withHandling(this, async () => {
      return stopDaemon();
    });
  });

daemon
  .command('status')
  .description('Get daemon status')
  .action(async function daemonStatusAction(this: Command) {
    await withHandling(this, async () => {
      return getDaemonStatus();
    });
  });

program
  .command('setup [platform]')
  .description('Install shell hooks or AI-platform SKILL.md integration')
  .option('--silent', 'Suppress shell setup logs')
  .action(async function setupAction(this: Command, platform?: string, options?: { silent?: boolean }) {
    await withHandling(this, async () => {
      const normalizedPlatform = platform?.trim().toLowerCase();
      if (!normalizedPlatform || normalizedPlatform === 'shell' || normalizedPlatform === 'hooks') {
        await setupShellHooks(options?.silent ? ['--silent'] : []);
        return { ok: true, mode: 'shell-hooks' };
      }

      return copySkill(normalizedPlatform);
    });
  });

program
  .command('check')
  .description('Check whether a newer gopeak-cli version is available')
  .allowUnknownOption(true)
  .action(async function checkAction(this: Command) {
    await withHandling(this, async () => {
      await checkForUpdates(process.argv.slice(3));
      return { ok: true };
    });
  });

program
  .command('notify')
  .description('Show interactive update/star notifications used by shell hooks')
  .action(async function notifyAction(this: Command) {
    await withHandling(this, async () => {
      await showNotification();
      return { ok: true };
    });
  });

program
  .command('star')
  .description('Star the GitHub repository using gh when available')
  .action(async function starAction(this: Command) {
    await withHandling(this, async () => {
      await starGodotFlow();
      return { ok: true };
    });
  });

program
  .command('uninstall')
  .description('Remove shell hooks from your shell rc file')
  .action(async function uninstallAction(this: Command) {
    await withHandling(this, async () => {
      await uninstallHooks();
      return { ok: true };
    });
  });

program
  .command('version')
  .description('Print the current gopeak-cli version')
  .action(async function versionAction(this: Command) {
    await withHandling(this, async () => ({ version: getLocalVersion() }));
  });

program
  .command('install-skill <platform>')
  .description('Alias of setup <platform> for README compatibility')
  .action(async function installSkillAction(this: Command, platform: string) {
    await withHandling(this, async () => {
      return copySkill(platform);
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  outputError(undefined, error);
  process.exitCode = 1;
});
