import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  APP_NAME,
  DETECTABLE_COMMANDS,
  ONBOARDING_SHOWN_FILE,
  REPO_URL,
  STAR_PROMPTED_FILE,
  detectAvailableCommands,
  ensureFlowDir,
  getLocalVersion,
  getShellName,
  getShellRcFile,
} from './utils.js';

const MARKER_START = '# >>> gopeak-cli shell hooks >>>';
const MARKER_END = '# <<< gopeak-cli shell hooks <<<';

export { MARKER_START, MARKER_END, generateHookBlock, removeHookBlock };

export async function ensureWrappedShellHooks(args: string[] = []): Promise<boolean> {
  const silent = args.includes('--silent');
  const rcFile = getShellRcFile();

  if (!existsSync(rcFile)) {
    await setupShellHooks(['--wrap-ai-clis', ...(silent ? ['--silent'] : [])]);
    return true;
  }

  const content = readFileSync(rcFile, 'utf8');
  const hasManagedBlock = content.includes(MARKER_START) && content.includes(MARKER_END);
  const hasWrappedPrecheck = hasManagedBlock && content.includes('__gopeak_cli_precheck()');

  if (!hasWrappedPrecheck) {
    await setupShellHooks(['--wrap-ai-clis', ...(silent ? ['--silent'] : [])]);
    return true;
  }

  return false;
}

export async function setupShellHooks(args: string[] = []): Promise<void> {
  const silent = args.includes('--silent');
  const wrapAiClis = args.includes('--wrap-ai-clis');
  const shellName = getShellName();
  const rcFile = getShellRcFile();
  const detectedCommands = await detectAvailableCommands();
  const hookBlock = generateHookBlock(shellName, detectedCommands, { wrapAiClis });
  const log = silent ? (..._args: unknown[]) => undefined : console.log.bind(console);

  if (!existsSync(rcFile)) {
    writeFileSync(rcFile, '');
    log(`⚠️  ${rcFile} was missing and has been created.`);
  }

  const content = readFileSync(rcFile, 'utf8');
  const nextContent = content.includes(MARKER_START)
    ? `${removeHookBlock(content)}\n${hookBlock}\n`
    : `${content}${content.endsWith('\n') || content.length === 0 ? '' : '\n'}${hookBlock}\n`;

  writeFileSync(rcFile, nextContent);

  if (content.includes(MARKER_START)) {
    log(`🔄 Updated ${APP_NAME} shell hooks in ${rcFile}`);
  } else {
    log(`✅ Installed ${APP_NAME} shell hooks in ${rcFile}`);
  }

  log(`   Detected AI CLIs: ${detectedCommands.length > 0 ? detectedCommands.join(', ') : 'none'}`);
  if (!wrapAiClis) {
    log(`   Passive mode: no third-party CLI wrappers installed. Re-run with ${APP_NAME} setup --wrap-ai-clis to enable them.`);
  }
  log(`   Reload with: source ${rcFile}`);
  log('');

  ensureFlowDir();
  if (!existsSync(ONBOARDING_SHOWN_FILE)) {
    printOnboarding(log);
    writeFileSync(ONBOARDING_SHOWN_FILE, new Date().toISOString());
  }

  if (!existsSync(STAR_PROMPTED_FILE)) {
    log(`⭐ If ${APP_NAME} helps your workflow, you can star the repo later with: ${APP_NAME} star`);
    log('');
  }
}

function generateHookBlock(
  shellName: 'bash' | 'zsh',
  detectedCommands: string[],
  options: { wrapAiClis?: boolean } = {},
): string {
  const wrapAiClis = options.wrapAiClis ?? false;
  const wrappedCommands = wrapAiClis ? [...DETECTABLE_COMMANDS] : detectedCommands;
  const standardCommands = wrappedCommands.filter((command) => command !== 'omx');
  const lines: string[] = [
    MARKER_START,
    wrapAiClis
      ? `# ${APP_NAME} update notifications for AI CLI tools`
      : `# ${APP_NAME} shell hooks (passive by default; no third-party CLI wrapping)`,
    `# Installed by: ${APP_NAME} setup | Remove with: ${APP_NAME} uninstall`,
    `# Detected at setup: ${detectedCommands.length > 0 ? detectedCommands.join(', ') : 'none from [' + DETECTABLE_COMMANDS.join(', ') + ']'}`,
  ];

  if (!wrapAiClis) {
    lines.push(`# To wrap detected AI CLIs with ${APP_NAME} prechecks, rerun: ${APP_NAME} setup --wrap-ai-clis`);
    lines.push(MARKER_END);
    return lines.join('\n');
  }

  lines.push('');
  lines.push('__gopeak_cli_precheck() {');
  lines.push('  local notify="$HOME/.gopeak-cli/notify"');
  lines.push('  local star="$HOME/.gopeak-cli/star-prompted"');
  lines.push('  if [ -f "$notify" ] || [ ! -f "$star" ]; then');
  lines.push(`    command -v ${APP_NAME} >/dev/null 2>&1 && ${APP_NAME} notify`);
  lines.push('  fi');
  lines.push('  local ts="$HOME/.gopeak-cli/last-check"');
  lines.push('  if [ -f "$ts" ]; then');
  lines.push('    local age=$(( $(date +%s) - $(cat "$ts") ))');
  lines.push('    [ "$age" -lt 86400 ] && return');
  lines.push('  fi');
  lines.push(`  command -v ${APP_NAME} >/dev/null 2>&1 && ${APP_NAME} check --bg >/dev/null 2>&1 &`);
  lines.push('}');
  lines.push('');

  for (const command of standardCommands) {
    lines.push(`${command}() { __gopeak_cli_precheck; command ${command} "$@"; }`);
  }

  if (wrappedCommands.includes('omx')) {
    if (shellName === 'zsh') {
      lines.push('if typeset -f omx >/dev/null 2>&1; then');
      lines.push('  eval "$(functions omx | sed \"1s/^omx /__gopeak_cli_orig_omx /\")"');
      lines.push('  omx() { __gopeak_cli_precheck; __gopeak_cli_orig_omx "$@"; }');
      lines.push('else');
      lines.push('  omx() { __gopeak_cli_precheck; command omx "$@"; }');
      lines.push('fi');
    } else {
      lines.push('if declare -f omx >/dev/null 2>&1; then');
      lines.push(String.raw`  eval "$(declare -f omx | sed '1s/^omx /__gopeak_cli_orig_omx /')"`);
      lines.push('  omx() { __gopeak_cli_precheck; __gopeak_cli_orig_omx "$@"; }');
      lines.push('else');
      lines.push('  omx() { __gopeak_cli_precheck; command omx "$@"; }');
      lines.push('fi');
    }
    lines.push('');
  }

  lines.push(MARKER_END);
  return lines.join('\n');
}

function removeHookBlock(content: string): string {
  const pattern = new RegExp(`\\n?${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`, 'g');
  return content.replace(pattern, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printOnboarding(log: (...args: unknown[]) => void): void {
  const version = getLocalVersion();
  log('╔══════════════════════════════════════════════════════╗');
  log(`║  🎮 ${APP_NAME} v${version}${' '.repeat(Math.max(0, 34 - version.length))}║`);
  log('║                                                      ║');
  log('║  CLI-first Godot automation for humans and agents    ║');
  log('║                                                      ║');
  log(`║  📖 Docs:   ${REPO_URL.padEnd(39)}║`);
  log(`║  ⭐ Star:   ${`${APP_NAME} star`.padEnd(39)}║`);
  log(`║  🔄 Update: ${`${APP_NAME} check`.padEnd(39)}║`);
  log('╚══════════════════════════════════════════════════════╝');
  log('');
}
