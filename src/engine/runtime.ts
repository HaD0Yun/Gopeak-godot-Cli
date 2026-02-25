import { createConnection } from 'node:net';
import { GodotFlowError } from '../errors.js';
import type { ExecutionResult, RuntimeConfig } from '../types/engine.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStringType(value: Record<string, unknown>, type: string): boolean {
  return typeof value.type === 'string' && value.type === type;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(value, key);
}

function buildDuration(startedAt: number): number {
  return Date.now() - startedAt;
}

function parseResponseLine(rawLine: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawLine);
  } catch (error) {
    throw new GodotFlowError('EXECUTION_FAILED', 'Failed to parse runtime response as JSON', {
      rawResponse: rawLine,
      reason: error instanceof Error ? error.message : 'Unknown parse error',
    });
  }

  if (!isRecord(parsed)) {
    throw new GodotFlowError('EXECUTION_FAILED', 'Runtime response must be a JSON object', {
      rawResponse: rawLine,
    });
  }

  return parsed;
}

function toExecutionResult(response: Record<string, unknown>, startedAt: number): ExecutionResult {
  const durationMs = buildDuration(startedAt);

  if (hasStringType(response, 'error')) {
    const message = typeof response.message === 'string'
      ? response.message
      : 'Runtime execution failed';

    return {
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message,
        details: response,
      },
      durationMs,
    };
  }

  return {
    success: true,
    data: response,
    durationMs,
  };
}

export async function executeRuntime(
  fnName: string,
  args: Record<string, unknown>,
  config: RuntimeConfig,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const requestId = startedAt;

  return new Promise<ExecutionResult>((resolve, reject) => {
    const socket = createConnection({
      host: config.host,
      port: config.port,
    });

    let settled = false;
    let buffer = '';

    const finishResolve = (result: ExecutionResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      if (!socket.destroyed) {
        socket.destroy();
      }

      resolve({
        ...result,
        durationMs: result.durationMs ?? buildDuration(startedAt),
      });
    };

    const finishReject = (error: GodotFlowError): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      if (!socket.destroyed) {
        socket.destroy();
      }
      reject(error);
    };

    const consumeLine = (line: string): void => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      let response: Record<string, unknown>;
      try {
        response = parseResponseLine(trimmed);
      } catch (error) {
        if (error instanceof GodotFlowError) {
          finishReject(
            new GodotFlowError(error.code, error.message, {
              ...(error.details ?? {}),
              fnName,
              host: config.host,
              port: config.port,
            }),
          );
          return;
        }

        finishReject(
          new GodotFlowError('EXECUTION_FAILED', 'Unexpected runtime response parsing error', {
            fnName,
            host: config.host,
            port: config.port,
          }),
        );
        return;
      }

      if (hasStringType(response, 'welcome')) {
        return;
      }

      if (hasOwn(response, 'id') && response.id !== requestId) {
        return;
      }

      if (!hasOwn(response, 'id') && hasStringType(response, 'signal_event')) {
        return;
      }

      finishResolve(toExecutionResult(response, startedAt));
    };

    const flushBufferLines = (): void => {
      while (!settled) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) {
          return;
        }

        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        consumeLine(line);
      }
    };

    const timeoutHandle = setTimeout(() => {
      finishReject(
        new GodotFlowError('ENGINE_TIMEOUT', `Runtime command '${fnName}' timed out after ${config.timeoutMs}ms`, {
          fnName,
          timeoutMs: config.timeoutMs,
          host: config.host,
          port: config.port,
        }),
      );
    }, config.timeoutMs);

    socket.setEncoding('utf8');

    socket.on('connect', () => {
      const payload = JSON.stringify({ command: fnName, params: args, id: requestId });
      socket.write(`${payload}\n`);
    });

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      flushBufferLines();
    });

    socket.on('end', () => {
      if (settled) {
        return;
      }

      const trailing = buffer.trim();
      if (!trailing) {
        finishReject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Runtime connection closed before a response was received', {
            fnName,
            host: config.host,
            port: config.port,
          }),
        );
        return;
      }

      consumeLine(trailing);
      if (!settled) {
        finishReject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Runtime connection closed without a matching command response', {
            fnName,
            host: config.host,
            port: config.port,
            trailingResponse: trailing,
          }),
        );
      }
    });

    socket.on('error', (error: NodeJS.ErrnoException) => {
      const message = error.code === 'ECONNREFUSED'
        ? `Failed to connect to Godot runtime at ${config.host}:${config.port}. Ensure the game is running with the runtime addon enabled.`
        : `Runtime TCP connection failed: ${error.message}`;

      finishReject(
        new GodotFlowError('ENGINE_CONNECTION_FAILED', message, {
          fnName,
          host: config.host,
          port: config.port,
          code: error.code ?? 'UNKNOWN',
          cause: error.message,
        }),
      );
    });
  });
}
