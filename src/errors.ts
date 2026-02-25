export type ErrorCode =
  | 'FUNCTION_NOT_FOUND'
  | 'INVALID_ARGS'
  | 'ENGINE_TIMEOUT'
  | 'ENGINE_CONNECTION_FAILED'
  | 'GODOT_NOT_FOUND'
  | 'EXECUTION_FAILED'
  | 'REGISTRY_ERROR';

export class GodotFlowError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GodotFlowError';
  }

  toJSON(): {
    error: { code: string; message: string; details?: Record<string, unknown> };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  toMcpError(): { content: Array<{ type: 'text'; text: string }>; isError: true } {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.toJSON()),
        },
      ],
      isError: true,
    };
  }
}
