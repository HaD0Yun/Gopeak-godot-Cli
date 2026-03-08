import { spawn } from 'node:child_process';
import { GodotFlowError } from '../errors.js';
import type { HeadlessConfig, ExecutionResult } from '../types/engine.js';

const OPERATIONS_SCRIPT_PATH = 'src/scripts/godot_operations.gd';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseExecutionResult(stdout: string): ExecutionResult {
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

  throw new GodotFlowError('EXECUTION_FAILED', 'Failed to parse JSON result from Godot stdout', {
    stdout,
  });
}

export async function executeHeadless(
  fnName: string,
  args: Record<string, unknown>,
  config: HeadlessConfig,
): Promise<ExecutionResult> {
  if (!config.projectPath) {
    throw new GodotFlowError('INVALID_ARGS', 'Headless execution requires a Godot project path. Run from a Godot project folder, pass --project-path, or set GODOT_FLOW_PROJECT_PATH.', {
      fnName,
      envKey: 'GODOT_FLOW_PROJECT_PATH',
      suggestedCommands: [
        'gopeak-cli doctor --format text',
        'gopeak-cli exec <function> --project-path /path/to/project',
      ],
    });
  }

  if (!config.godotPath) {
    throw new GodotFlowError('GODOT_NOT_FOUND', 'Godot executable path is not configured');
  }

  const projectPath = config.projectPath;

  const startedAt = Date.now();

  const result = await new Promise<ExecutionResult>((resolve, reject) => {
    const spawnArgs = [
      '--headless',
      '--path',
      projectPath,
      '--script',
      OPERATIONS_SCRIPT_PATH,
      fnName,
      JSON.stringify(args),
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
            new GodotFlowError('GODOT_NOT_FOUND', `Godot executable not found at path: ${config.godotPath}. Set GODOT_FLOW_GODOT_PATH to your Godot 4 executable and rerun gopeak-cli doctor.`, {
              godotPath: config.godotPath,
              envKey: 'GODOT_FLOW_GODOT_PATH',
              suggestedCommands: ['gopeak-cli doctor --format text'],
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
          parsedResult = parseExecutionResult(stdout);
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
