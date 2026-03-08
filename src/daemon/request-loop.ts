import { GodotFlowError } from '../errors.js';

type JsonRecord = Record<string, unknown>;

export interface RequestLoopError {
  code: string;
  message: string;
  details?: unknown;
}

export type RequestLoopResponse =
  | ({
    success: true;
  } & JsonRecord)
  | {
    success: false;
    error: RequestLoopError;
  };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function runRequestLoop(
  rawRequest: string,
  process: (request: JsonRecord) => Promise<JsonRecord>,
): Promise<RequestLoopResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawRequest);
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: `Invalid JSON request: ${toErrorMessage(error)}`,
      },
    };
  }

  if (!isRecord(parsed)) {
    return {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'IPC request must be a JSON object',
      },
    };
  }

  try {
    const payload = await process(parsed);
    return {
      success: true,
      ...payload,
    };
  } catch (error) {
    const normalized = error instanceof GodotFlowError
      ? error
      : new GodotFlowError('EXECUTION_FAILED', toErrorMessage(error));

    return {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
    };
  }
}
