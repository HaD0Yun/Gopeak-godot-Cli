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

export { MARKER_START, MARKER_END };

export async function setupShellHooks(args: string[] = []): Promise<void> {
  const silent = args.includes('--silent');
  const shellName = getShellName();
  const rcFile = getShellRcFile();
  const detectedCommands = await detectAvailableCommands();
  const hookBlock = generateHookBlock(shellName, detectedCommands);
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

function generateHookBlock(shellName: 'bash' | 'zsh', detectedCommands: string[]): string {
  const standardCommands = detectedCommands.filter((command) => command !== 'omx');
  const lines: string[] = [
    MARKER_START,
    `# ${APP_NAME} update notifications for AI CLI tools`,
    `# Installed by: ${APP_NAME} setup | Remove with: ${APP_NAME} uninstall`,
    `# Detected at setup: ${detectedCommands.length > 0 ? detectedCommands.join(', ') : 'none from [' + DETECTABLE_COMMANDS.join(', ') + ']'}`,
    '',
    '__gopeak_cli_precheck() {',
    '  local notify="$HOME/.gopeak-cli/notify"',
    '  local star="$HOME/.gopeak-cli/star-prompted"',
    '  if [ -f "$notify" ] || [ ! -f "$star" ]; then',
    `    command -v ${APP_NAME} >/dev/null 2>&1 && ${APP_NAME} notify`,
    '  fi',
    '  local ts="$HOME/.gopeak-cli/last-check"',
    '  if [ -f "$ts" ]; then',
    '    local age=$(( $(date +%s) - $(cat "$ts") ))',
    '    [ "$age" -lt 86400 ] && return',
    '  fi',
    `  command -v ${APP_NAME} >/dev/null 2>&1 && ${APP_NAME} check --bg >/dev/null 2>&1 &`,
    '}',
    '',
  ];

  for (const command of standardCommands) {
    lines.push(`${command}() { __gopeak_cli_precheck; command ${command} "$@"; }`);
  }

  if (detectedCommands.includes('omx')) {
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
  return content.replace(pattern, '').trimEnd();
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
