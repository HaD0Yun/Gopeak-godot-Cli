import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getShellRcFile } from './utils.js';
import { MARKER_END, MARKER_START } from './setup.js';

export async function uninstallHooks(): Promise<void> {
  const rcFile = getShellRcFile();

  if (!existsSync(rcFile)) {
    console.log(`ℹ️  ${rcFile} does not exist. Nothing to remove.`);
    return;
  }

  const content = readFileSync(rcFile, 'utf8');
  if (!content.includes(MARKER_START)) {
    console.log(`ℹ️  No gopeak-cli shell hooks found in ${rcFile}.`);
    return;
  }

  writeFileSync(rcFile, removeHookBlock(content));
  console.log(`✅ Removed gopeak-cli shell hooks from ${rcFile}`);
  console.log(`   Reload with: source ${rcFile}`);
}

function removeHookBlock(content: string): string {
  const pattern = new RegExp(`\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`, 'g');
  return content.replace(pattern, '\n').replace(/^\n+/, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
