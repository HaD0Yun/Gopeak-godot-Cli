import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from './mcp/server.js';
import { APP_VERSION } from './version.js';

function readPackageVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}

test('APP_VERSION stays aligned with package.json version', () => {
  assert.equal(APP_VERSION, readPackageVersion());
});

test('createServer exposes package version in MCP server metadata', () => {
  const server = createServer();
  const serverInfo = Reflect.get(server.server as object, '_serverInfo') as { version: string; name: string };

  assert.equal(serverInfo.name, 'godot-flow');
  assert.equal(serverInfo.version, APP_VERSION);
});
