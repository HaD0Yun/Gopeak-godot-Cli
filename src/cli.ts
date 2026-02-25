#!/usr/bin/env node

import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { registry } from './registry/index.js';
import { executeHeadless } from './engine/headless.js';
import { executeRuntime } from './engine/runtime.js';
import { executeLSP } from './engine/lsp.js';
import { executeDAP } from './engine/dap.js';
import { startDaemon, stopDaemon, getDaemonStatus } from './daemon/dap-daemon.js';
import { loadConfig } from './config.js';
import { GodotFlowError } from './errors.js';
import type { ExecutionResult } from './types/engine.js';
import type { FunctionDefinition } from './types/function.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function parseExecArgs(rawArgs?: string): Record<string, unknown> {
  if (!rawArgs) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch (error) {
    throw new GodotFlowError('INVALID_ARGS', 'Failed to parse --args as JSON', {
      args: rawArgs,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (!isRecord(parsed)) {
    throw new GodotFlowError('INVALID_ARGS', 'The --args payload must be a JSON object', {
      args: rawArgs,
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

async function routeExecution(
  definition: FunctionDefinition,
  args: Record<string, unknown>,
  command: Command,
): Promise<ExecutionResult> {
  const context = parseContext(command);
  const config = loadConfig({
    projectPath: context.projectPath,
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
    target = resolve(process.cwd(), '.claude/skills/godot-flow/SKILL.md');
  } else if (normalizedPlatform === 'codex') {
    source = resolve(__dirname, '../skills/codex/SKILL.md');
    target = resolve(process.cwd(), '.codex/skills/godot-flow/SKILL.md');
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
  .name('godot-flow')
  .version('1.0.0')
  .description('Godot Flow CLI')
  .option('--format <type>', 'Output format (json|text)', 'json')
  .option('--timeout <ms>', 'Timeout in ms')
  .option('--project-path <path>', 'Godot project path');

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
  .action(async function execAction(this: Command, name: string, options: { args?: string }) {
    await withHandling(this, async () => {
      const definition = resolveFunctionOrThrow(name);
      const args = parseExecArgs(options.args);
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
  .command('setup <platform>')
  .description('Setup SKILL.md integration')
  .action(async function setupAction(this: Command, platform: string) {
    await withHandling(this, async () => {
      return copySkill(platform);
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  outputError(undefined, error);
  process.exitCode = 1;
});
