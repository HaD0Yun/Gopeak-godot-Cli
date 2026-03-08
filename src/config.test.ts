import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig } from './config.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CWD = process.cwd();

function resetProcessState(): void {
  process.chdir(ORIGINAL_CWD);

  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, ORIGINAL_ENV);
}

test.afterEach(() => {
  resetProcessState();
});

test('loadConfig applies CLI overrides before env and defaults', () => {
  process.env.GODOT_FLOW_PROJECT_PATH = '/env/project';
  process.env.GODOT_FLOW_GODOT_PATH = '/usr/bin/godot-env';
  process.env.GODOT_FLOW_RUNTIME_PORT = '8888';
  process.env.GODOT_FLOW_LSP_PORT = '7000';
  process.env.GODOT_FLOW_DAP_PORT = '7001';
  process.env.GODOT_FLOW_TIMEOUT = '45000';

  const config = loadConfig({
    projectPath: '/cli/project',
    godotPath: '/usr/bin/godot-cli',
    runtimePort: 9000,
    timeoutMs: 12345,
  });

  assert.deepEqual(config, {
    projectPath: '/cli/project',
    godotPath: '/usr/bin/godot-cli',
    runtimePort: 9000,
    lspPort: 7000,
    dapPort: 7001,
    timeoutMs: 12345,
  });
});

test('loadConfig infers projectPath from cwd when project.godot exists', () => {
  const projectDir = mkdtempSync(join(tmpdir(), 'gopeak-config-'));
  writeFileSync(join(projectDir, 'project.godot'), '[application]\nconfig/name="Test"\n');
  process.chdir(projectDir);

  delete process.env.GODOT_FLOW_PROJECT_PATH;

  const config = loadConfig();
  assert.equal(config.projectPath, projectDir);
  assert.equal(config.godotPath, 'godot');
  assert.equal(config.runtimePort, 7777);
  assert.equal(config.timeoutMs, 30000);
});

test('loadConfig rejects invalid port and timeout environment values', () => {
  process.env.GODOT_FLOW_RUNTIME_PORT = '0';
  assert.throws(() => loadConfig(), /Invalid GODOT_FLOW_RUNTIME_PORT: expected port 1-65535, got 0/);

  resetProcessState();
  process.env.GODOT_FLOW_TIMEOUT = '-1';
  assert.throws(() => loadConfig(), /Invalid GODOT_FLOW_TIMEOUT: expected positive integer, got -1/);
});
