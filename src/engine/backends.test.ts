import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeHeadless, resolveOperationsScriptPath } from './headless.js';
import { executeRuntime } from './runtime.js';
import { executeLSP } from './lsp.js';
import { executeDAP } from './dap.js';

const require = createRequire(import.meta.url);

async function getUnusedPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to allocate test port'));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

test('resolveOperationsScriptPath finds the bundled/script asset for headless execution', () => {
  const resolved = resolveOperationsScriptPath();
  assert.match(resolved, /godot_operations\.gd$/);
  assert.ok(require('node:fs').existsSync(resolved));
});

test('executeHeadless rejects missing projectPath with INVALID_ARGS', async () => {
  await assert.rejects(
    () => executeHeadless('create_scene', {}, {
      godotPath: '/usr/bin/godot',
      projectPath: '',
      timeoutMs: 100,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'INVALID_ARGS');
      return true;
    },
  );
});

test('executeHeadless rejects missing godotPath with GODOT_NOT_FOUND', async () => {
  await assert.rejects(
    () => executeHeadless('create_scene', {}, {
      godotPath: '',
      projectPath: '/tmp/project',
      timeoutMs: 100,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'GODOT_NOT_FOUND');
      return true;
    },
  );
});



test('executeHeadless sends camelCase and snake_case aliases to the script payload', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'gopeak-headless-args-'));
  const fakeGodot = join(tmp, 'fake-godot.sh');
  const logPath = join(tmp, 'args.log');

  await writeFile(
    fakeGodot,
    `#!/usr/bin/env bash
printf '%s\n' "$@" > "${logPath}"
echo '{"success":true}'
`,
    'utf8',
  );
  await chmod(fakeGodot, 0o755);

  try {
    await executeHeadless('create_scene', {
      scenePath: 'scenes/Main.tscn',
      rootNodeType: 'Node2D',
      nestedValue: { childPath: 'res://x' },
    }, {
      godotPath: fakeGodot,
      projectPath: '/tmp/project',
      timeoutMs: 1000,
    });

    const argsLog = await readFile(logPath, 'utf8');
    assert.match(argsLog, /"scenePath":"scenes\/Main\.tscn"/);
    assert.match(argsLog, /"scene_path":"scenes\/Main\.tscn"/);
    assert.match(argsLog, /"rootNodeType":"Node2D"/);
    assert.match(argsLog, /"root_node_type":"Node2D"/);
    assert.match(argsLog, /"childPath":"res:\/\/x"/);
    assert.match(argsLog, /"child_path":"res:\/\/x"/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});




test('executeHeadless falls back to successful text output when legacy scripts do not emit JSON', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'gopeak-headless-text-'));
  const fakeGodot = join(tmp, 'fake-godot.sh');

  await writeFile(
    fakeGodot,
    `#!/usr/bin/env bash
echo 'Legacy success line'
`,
    'utf8',
  );
  await chmod(fakeGodot, 0o755);

  try {
    const result = await executeHeadless('create_scene', {}, {
      godotPath: fakeGodot,
      projectPath: '/tmp/project',
      timeoutMs: 1000,
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.data, { stdout: 'Legacy success line' });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});


test('executeRuntime returns ENGINE_CONNECTION_FAILED when no runtime server is listening', async () => {
  const port = await getUnusedPort();
  await assert.rejects(
    () => executeRuntime('get_runtime_status', {}, {
      host: '127.0.0.1',
      port,
      projectPath: '/tmp/project',
      timeoutMs: 200,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'ENGINE_CONNECTION_FAILED');
      return true;
    },
  );
});

test('executeLSP rejects missing filePath with INVALID_ARGS before network use', async () => {
  await assert.rejects(
    () => executeLSP('lsp_hover', {}, {
      host: '127.0.0.1',
      port: 6553,
      projectPath: process.cwd(),
      timeoutMs: 200,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'INVALID_ARGS');
      return true;
    },
  );
});

test('executeDAP rejects invalid breakpoint line with INVALID_ARGS', async () => {
  await assert.rejects(
    () => executeDAP('dap_set_breakpoint', { scriptPath: 'res://player.gd', line: 0 }, {
      host: '127.0.0.1',
      port: 6554,
      projectPath: process.cwd(),
      timeoutMs: 200,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'INVALID_ARGS');
      return true;
    },
  );
});
