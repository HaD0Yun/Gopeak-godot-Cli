import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GodotFlowError } from '../errors.js';
import type { HeadlessConfig, ExecutionResult } from '../types/engine.js';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const OPERATIONS_SCRIPT_CANDIDATES = [
  resolve(MODULE_DIR, '../scripts/godot_operations.gd'),
  resolve(MODULE_DIR, '../../src/scripts/godot_operations.gd'),
  resolve(process.cwd(), 'dist/scripts/godot_operations.gd'),
  resolve(process.cwd(), 'src/scripts/godot_operations.gd'),
];

export function resolveOperationsScriptPath(): string {
  for (const candidate of OPERATIONS_SCRIPT_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new GodotFlowError(
    'EXECUTION_FAILED',
    'Unable to locate godot_operations.gd for headless execution',
    { candidates: OPERATIONS_SCRIPT_CANDIDATES },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}


function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function withSnakeCaseAliases<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => withSnakeCaseAliases(item)) as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  const augmented: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    const normalizedValue = withSnakeCaseAliases(entryValue);
    augmented[key] = normalizedValue;
    augmented[toSnakeCaseKey(key)] = normalizedValue;
  }

  return augmented as T;
}

function parseExecutionResult(stdout: string, stderr = "", exitCode?: number | null): ExecutionResult {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new GodotFlowError('EXECUTION_FAILED', 'Godot process produced empty stdout', {
      stdout,
    });
  }

  const candidates: string[] = [trimmed];
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    candidates.push(lines[i]);
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isRecord(parsed) && typeof parsed.success === 'boolean') {
        const result: ExecutionResult = {
          success: parsed.success,
          ...('data' in parsed ? { data: parsed.data } : {}),
          ...('error' in parsed ? { error: parsed.error as ExecutionResult['error'] } : {}),
          ...('durationMs' in parsed
            && typeof parsed.durationMs === 'number'
            ? { durationMs: parsed.durationMs }
            : {}),
        };
        return result;
      }

      return { success: true, data: parsed };
    } catch {
      /* parse failed - fallback below */
    }
  }

  if ((exitCode ?? 0) === 0) {
    return {
      success: true,
      data: {
        stdout: trimmed,
        ...(stderr.trim().length > 0 ? { stderr: stderr.trim() } : {}),
      },
    };
  }

  throw new GodotFlowError('EXECUTION_FAILED', 'Failed to parse JSON result from Godot stdout', {
    stdout,
    stderr,
    exitCode: exitCode ?? undefined,
  });
}

export async function executeHeadless(
  fnName: string,
  args: Record<string, unknown>,
  config: HeadlessConfig,
): Promise<ExecutionResult> {
  if (!config.projectPath) {
    throw new GodotFlowError('INVALID_ARGS', 'Headless execution requires projectPath', {
      fnName,
    });
  }

  if (!config.godotPath) {
    throw new GodotFlowError('GODOT_NOT_FOUND', 'Godot executable path is not configured');
  }

  const projectPath = config.projectPath;
  const operationsScriptPath = resolveOperationsScriptPath();

  const startedAt = Date.now();

  const result = await new Promise<ExecutionResult>((resolve, reject) => {
    const spawnArgs = [
      '--headless',
      '--path',
      projectPath,
      '--script',
      operationsScriptPath,
      fnName,
      JSON.stringify(withSnakeCaseAliases(args)),
    ];

    const child = spawn(config.godotPath, spawnArgs);

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (handler: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      handler();
    };

    const timeoutHandle = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => {
        reject(
          new GodotFlowError('ENGINE_TIMEOUT', `Headless execution timed out after ${config.timeoutMs}ms`, {
            fnName,
            timeoutMs: config.timeoutMs,
          }),
        );
      });
    }, config.timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === 'ENOENT') {
          reject(
            new GodotFlowError('GODOT_NOT_FOUND', `Godot executable not found at path: ${config.godotPath}`, {
              godotPath: config.godotPath,
            }),
          );
          return;
        }

        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to start headless Godot process', {
            message: error.message,
            code: error.code ?? 'UNKNOWN',
          }),
        );
      });
    });

    child.on('close', (code, signal) => {
      finish(() => {
        let parsedResult: ExecutionResult;
        try {
          parsedResult = parseExecutionResult(stdout, stderr, code);
        } catch (parseError) {
          if (parseError instanceof GodotFlowError) {
            reject(
              new GodotFlowError(parseError.code, parseError.message, {
                ...parseError.details,
                stderr,
                exitCode: code,
                signal: signal ?? undefined,
              }),
            );
            return;
          }

          reject(
            new GodotFlowError('EXECUTION_FAILED', 'Failed to parse Godot execution result', {
              stdout,
              stderr,
              exitCode: code,
              signal: signal ?? undefined,
            }),
          );
          return;
        }

        const executionResult: ExecutionResult = {
          ...parsedResult,
          durationMs: Date.now() - startedAt,
        };

        if (code !== 0 && executionResult.success) {
          resolve({
            success: false,
            error: {
              code: 'EXECUTION_FAILED',
              message: `Godot process exited with code ${code ?? 'unknown'}`,
              details: {
                stderr,
                exitCode: code,
                signal: signal ?? undefined,
              },
            },
            durationMs: executionResult.durationMs,
          });
          return;
        }

        if (!executionResult.success && !executionResult.error) {
          resolve({
            ...executionResult,
            error: {
              code: 'EXECUTION_FAILED',
              message: stderr.trim() || 'Headless execution failed without explicit error payload',
            },
          });
          return;
        }

        resolve(executionResult);
      });
    });
  });

  return {
    ...result,
    durationMs: result.durationMs ?? Date.now() - startedAt,
  };
}
