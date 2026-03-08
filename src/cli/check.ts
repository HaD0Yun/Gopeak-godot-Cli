import {
  APP_NAME,
  PACKAGE_NAME,
  clearNotifyFile,
  compareSemver,
  ensureFlowDir,
  fetchLatestVersion,
  getLocalVersion,
  isCacheFresh,
  updateCacheTimestamp,
  writeNotifyFile,
} from './utils.js';
import { ensureWrappedShellHooks } from './setup.js';

export async function checkForUpdates(args: string[] = []): Promise<void> {
  const isBackground = args.includes('--bg');
  const isQuiet = args.includes('--quiet');

  await ensureWrappedShellHooks(['--silent']);
  ensureFlowDir();

  if (isBackground) {
    await runBackgroundCheck();
    return;
  }

  const currentVersion = getLocalVersion();
  const latestInfo = await fetchLatestVersion();

  if (!latestInfo) {
    if (!isQuiet) {
      console.log(`⚠️  Could not reach npm or GitHub to check ${PACKAGE_NAME} updates.`);
    }
    return;
  }

  if (compareSemver(latestInfo.version, currentVersion) > 0) {
    if (isQuiet) {
      console.log(`🚀 ${APP_NAME} v${latestInfo.version} available from ${latestInfo.channel}! Run: ${latestInfo.updateCommand}`);
    } else {
      printUpdateBox(currentVersion, latestInfo.version, latestInfo.updateCommand, latestInfo.releaseUrl, latestInfo.channel);
    }
    return;
  }

  if (!isQuiet) {
    console.log(`✅ ${APP_NAME} v${currentVersion} is up to date.`);
  }
}

async function runBackgroundCheck(): Promise<void> {
  if (isCacheFresh()) {
    return;
  }

  const currentVersion = getLocalVersion();
  const latestInfo = await fetchLatestVersion();

  updateCacheTimestamp();

  if (!latestInfo) {
    return;
  }

  if (compareSemver(latestInfo.version, currentVersion) > 0) {
    writeNotifyFile(
      `🚀 ${APP_NAME} v${latestInfo.version} available! (current: v${currentVersion}, channel: ${latestInfo.channel})\n   Run: ${latestInfo.updateCommand}`,
    );
    return;
  }

  clearNotifyFile();
}

function printUpdateBox(
  currentVersion: string,
  latestVersion: string,
  updateCommand: string,
  releaseUrl: string,
  channel: string,
): void {
  const line1 = `  🚀 ${APP_NAME} v${latestVersion} available! (current: v${currentVersion})`;
  const line2 = `  Channel: ${channel}`;
  const line3 = `  ${updateCommand}`;
  const line4 = `  ${releaseUrl}`;
  const width = Math.max(line1.length, line2.length, line3.length, line4.length) + 2;
  const pad = (value: string) => value + ' '.repeat(Math.max(0, width - value.length));

  console.log('');
  console.log(`╔${'═'.repeat(width)}╗`);
  console.log(`║${pad(line1)}║`);
  console.log(`║${pad(line2)}║`);
  console.log(`║${' '.repeat(width)}║`);
  console.log(`║${pad(line3)}║`);
  console.log(`║${pad(line4)}║`);
  console.log(`╚${'═'.repeat(width)}╝`);
  console.log('');
}
