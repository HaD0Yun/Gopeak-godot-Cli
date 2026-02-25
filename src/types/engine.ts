export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  durationMs?: number;
}

export interface EngineConfig {
  projectPath?: string;
  timeoutMs: number;
}

export interface HeadlessConfig extends EngineConfig {
  godotPath: string;
}

export interface RuntimeConfig extends EngineConfig {
  host: string;
  port: number;
}

export interface LSPConfig extends EngineConfig {
  host: string;
  port: number;
}

export interface DAPConfig extends EngineConfig {
  host: string;
  port: number;
}
