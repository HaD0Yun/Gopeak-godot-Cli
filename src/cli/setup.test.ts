import assert from 'node:assert/strict';
import test from 'node:test';
import { MARKER_END, MARKER_START, generateHookBlock, removeHookBlock } from './setup.js';

test('generateHookBlock is passive by default and does not wrap detected AI CLIs', () => {
  const hookBlock = generateHookBlock('bash', ['codex', 'claude', 'omx']);

  assert.match(hookBlock, /passive by default/);
  assert.match(hookBlock, /setup --wrap-ai-clis/);
  assert.doesNotMatch(hookBlock, /__gopeak_cli_precheck/);
  assert.doesNotMatch(hookBlock, /^codex\(\)/m);
  assert.doesNotMatch(hookBlock, /^claude\(\)/m);
  assert.doesNotMatch(hookBlock, /^omx\(\)/m);
});

test('generateHookBlock advertises the full detectable command list when nothing is installed', () => {
  const hookBlock = generateHookBlock('bash', []);

  assert.match(hookBlock, /Detected at setup: none from \[claude, claudecode, codex, cursor, gemini, copilot, omc, opencode, omx\]/);
});

test('generateHookBlock wraps newly detectable standard AI CLIs when explicitly enabled', () => {
  const hookBlock = generateHookBlock('bash', ['cursor', 'omc'], { wrapAiClis: true });

  assert.match(hookBlock, /__gopeak_cli_precheck\(\)/);
  assert.match(hookBlock, /^cursor\(\) \{ __gopeak_cli_precheck; command cursor "\$@"; \}$/m);
  assert.match(hookBlock, /^omc\(\) \{ __gopeak_cli_precheck; command omc "\$@"; \}$/m);
  assert.doesNotMatch(hookBlock, /__gopeak_cli_orig_omx/);
});

test('generateHookBlock wraps detected AI CLIs only when explicitly enabled', () => {
  const hookBlock = generateHookBlock('bash', ['codex', 'omx'], { wrapAiClis: true });

  assert.match(hookBlock, /__gopeak_cli_precheck\(\)/);
  assert.match(hookBlock, /^codex\(\) \{ __gopeak_cli_precheck; command codex "\$@"; \}$/m);
  assert.match(hookBlock, /^  omx\(\) \{ __gopeak_cli_precheck; __gopeak_cli_orig_omx "\$@"; \}$/m);
});

test('generateHookBlock preserves zsh omx wrapper fallback logic when wrapping is enabled', () => {
  const hookBlock = generateHookBlock('zsh', ['omx'], { wrapAiClis: true });

  assert.match(hookBlock, /^if typeset -f omx >\/dev\/null 2>&1; then$/m);
  assert.ok(hookBlock.includes('  eval "$(functions omx | sed "1s/^omx /__gopeak_cli_orig_omx /")"'));
  assert.match(hookBlock, /^else$/m);
  assert.match(hookBlock, /^  omx\(\) \{ __gopeak_cli_precheck; command omx "\$@"; \}$/m);
});

test('removeHookBlock removes generated shell hook blocks cleanly', () => {
  const existing = ['# user config', MARKER_START, '# generated', MARKER_END, 'export PATH="$HOME/bin:$PATH"'].join('\n');

  assert.equal(
    removeHookBlock(existing),
    ['# user config', 'export PATH="$HOME/bin:$PATH"'].join('\n'),
  );
});
