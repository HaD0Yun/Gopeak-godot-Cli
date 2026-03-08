import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('postinstall auto-runs wrapped shell hook setup so manual setup is not required', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts?: Record<string, string> };
  const postinstall = packageJson.scripts?.postinstall ?? '';

  assert.match(postinstall, /dist\/cli\.js/);
  assert.match(postinstall, /setup/);
  assert.match(postinstall, /--silent/);
  assert.match(postinstall, /--wrap-ai-clis/);
});
