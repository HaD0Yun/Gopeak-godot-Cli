import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distCliPath = resolve(__dirname, './cli.js');

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [distCliPath, ...args], {
    env,
    encoding: 'utf8',
  });
}

test('dist CLI --help prints usage information', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: gopeak-cli/i);
  assert.match(result.stdout, /listfunc/);
  assert.equal(result.stderr, '');
});

test('dist CLI --version prints the packaged version', () => {
  const result = runCli(['--version']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '1.0.0');
  assert.equal(result.stderr, '');
});

test('dist CLI listfunc routes through the registry without Godot', () => {
  const result = runCli(['listfunc', '--category', 'scene', '--format', 'json']);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
  assert.ok(payload.length > 0);
  assert.ok(payload.every((entry) => entry.category === 'scene'));
  assert.ok(payload.some((entry) => typeof entry.name === 'string'));
});

test('dist CLI exec get_project_info routes to headless with a fake Godot binary', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'gopeak-cli-smoke-'));

  try {
    const fakeGodotPath = join(tempRoot, 'fake-godot.mjs');
    writeFileSync(join(tempRoot, 'project.godot'), '');
    writeFileSync(
      fakeGodotPath,
      `#!/usr/bin/env node\nconst argv = process.argv.slice(2);\nconst fnName = argv.at(-2);\nconst args = JSON.parse(argv.at(-1) ?? '{}');\nprocess.stdout.write(JSON.stringify({ success: true, data: { fnName, args, argv } }));\n`,
    );
    chmodSync(fakeGodotPath, 0o755);

    const result = runCli(
      ['exec', 'get_project_info', '--project-path', tempRoot, '--format', 'json'],
      { ...process.env, GODOT_FLOW_GODOT_PATH: fakeGodotPath },
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout) as {
      success: boolean;
      data: { fnName: string; args: Record<string, unknown>; argv: string[] };
    };
    assert.equal(payload.success, true);
    assert.equal(payload.data.fnName, 'get_project_info');
    assert.deepEqual(payload.data.args, {});
    assert.ok(payload.data.argv.includes('--headless'));
    assert.ok(payload.data.argv.includes('--script'));
    assert.ok(payload.data.argv.includes('src/scripts/godot_operations.gd'));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
