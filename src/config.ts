import { GodotFlowError } from './errors.js';

export interface CliConfigOverrides {
  projectPath?: string;
  godotPath?: string;
  runtimePort?: number;
  lspPort?: number;
  dapPort?: number;
  timeoutMs?: number;
}

export interface AppConfig {
  projectPath?: string;
  godotPath: string;
  runtimePort: number;
  lspPort: number;
  dapPort: number;
  timeoutMs: number;
}

const DEFAULTS = {
  godotPath: 'godot',
  runtimePort: 7777,
  lspPort: 6005,
  dapPort: 6006,
  timeoutMs: 30000,
} as const;

function parsePort(value: string | undefined, fallback: number, envName: string): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new GodotFlowError('INVALID_ARGS', `Invalid ${envName}: expected port 1-65535, got ${value}`);
  }

  return parsed;
}

function parseTimeout(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GodotFlowError('INVALID_ARGS', `Invalid GODOT_FLOW_TIMEOUT: expected positive integer, got ${value}`);
  }

  return parsed;
}

export function loadConfig(cliOverrides: CliConfigOverrides = {}): AppConfig {
  const env = process.env;

  return {
    projectPath: cliOverrides.projectPath ?? env.GODOT_FLOW_PROJECT_PATH,
    godotPath: cliOverrides.godotPath ?? env.GODOT_FLOW_GODOT_PATH ?? DEFAULTS.godotPath,
    runtimePort:
      cliOverrides.runtimePort ??
      parsePort(env.GODOT_FLOW_RUNTIME_PORT, DEFAULTS.runtimePort, 'GODOT_FLOW_RUNTIME_PORT'),
    lspPort:
      cliOverrides.lspPort ?? parsePort(env.GODOT_FLOW_LSP_PORT, DEFAULTS.lspPort, 'GODOT_FLOW_LSP_PORT'),
    dapPort:
      cliOverrides.dapPort ?? parsePort(env.GODOT_FLOW_DAP_PORT, DEFAULTS.dapPort, 'GODOT_FLOW_DAP_PORT'),
    timeoutMs:
      cliOverrides.timeoutMs ?? parseTimeout(env.GODOT_FLOW_TIMEOUT, DEFAULTS.timeoutMs),
  };
}

export const CONFIG_ENV_KEYS = {
  projectPath: 'GODOT_FLOW_PROJECT_PATH',
  godotPath: 'GODOT_FLOW_GODOT_PATH',
  runtimePort: 'GODOT_FLOW_RUNTIME_PORT',
  lspPort: 'GODOT_FLOW_LSP_PORT',
  dapPort: 'GODOT_FLOW_DAP_PORT',
  timeoutMs: 'GODOT_FLOW_TIMEOUT',
} as const;
