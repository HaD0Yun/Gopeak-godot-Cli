import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeRuntime } from './engine/runtime.js';
import { executeLSP } from './engine/lsp.js';
import { executeDAP } from './engine/dap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distCliPath = resolve(__dirname, './cli.js');

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [distCliPath, ...args], {
    env,
    encoding: 'utf8',
  });
}

test('doctor reports actionable warnings for missing project path, Godot, and connectivity', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'gopeak-preflight-'));

  try {
    const result = runCli(['doctor', '--format', 'json'], {
      ...process.env,
      GODOT_FLOW_PROJECT_PATH: '',
      GODOT_FLOW_GODOT_PATH: join(tempRoot, 'missing-godot'),
      GODOT_FLOW_RUNTIME_PORT: '65531',
      GODOT_FLOW_LSP_PORT: '65532',
      GODOT_FLOW_DAP_PORT: '65533',
    });

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout) as {
      summary: { warned: number };
      checks: Array<{ name: string; status: string; message: string }>;
    };

    assert.ok(payload.summary.warned >= 4);
    const byName = new Map(payload.checks.map((check) => [check.name, check]));
    assert.match(byName.get('projectPath')?.message ?? '', /--project-path|GODOT_FLOW_PROJECT_PATH/);
    assert.match(byName.get('godot')?.message ?? '', /GODOT_FLOW_GODOT_PATH/);
    assert.match(byName.get('runtimeConnectivity')?.message ?? '', /runtime addon enabled/i);
    assert.match(byName.get('lspConnectivity')?.message ?? '', /Godot editor/i);
    assert.match(byName.get('dapConnectivity')?.message ?? '', /daemon start|debug session/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('headless execution failure explains how to provide project path', () => {
  const result = runCli(['exec', 'get_project_info', '--format', 'json'], {
    ...process.env,
    GODOT_FLOW_PROJECT_PATH: '',
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stderr) as { error: { code: string; message: string } };
  assert.equal(payload.error.code, 'INVALID_ARGS');
  assert.match(payload.error.message, /--project-path/);
  assert.match(payload.error.message, /GODOT_FLOW_PROJECT_PATH/);
});

test('doctor text output is readable and checklist-style', () => {
  const result = runCli(['doctor', '--format', 'text'], process.env);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Doctor summary:/);
  assert.match(result.stdout, /projectPath:/);
  assert.match(result.stdout, /runtimeConnectivity:/);
});

test('runtime connection failure suggests starting the runtime addon', async () => {
  await assert.rejects(
    () => executeRuntime('runtime_ping', {}, {
      host: '127.0.0.1',
      port: 65531,
      projectPath: undefined,
      timeoutMs: 250,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /runtime addon enabled/i);
      return true;
    },
  );
});

test('lsp and dap missing project path errors are actionable', async () => {
  await assert.rejects(
    () => executeLSP('lsp_diagnostics', { filePath: '/tmp/player.gd', content: 'extends Node\n' }, {
      host: '127.0.0.1',
      port: 65532,
      projectPath: undefined,
      timeoutMs: 250,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /GODOT_FLOW_PROJECT_PATH/);
      return true;
    },
  );

  await assert.rejects(
    () => executeDAP('debug_list_breakpoints', {}, {
      host: '127.0.0.1',
      port: 65533,
      projectPath: undefined,
      timeoutMs: 250,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /GODOT_FLOW_PROJECT_PATH/);
      return true;
    },
  );
});
