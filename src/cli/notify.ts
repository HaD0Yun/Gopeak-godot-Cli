import { createInterface } from 'node:readline';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import {
  APP_NAME,
  NOTIFY_FILE,
  ONBOARDING_SHOWN_FILE,
  PACKAGE_NAME,
  REPO_URL,
  STAR_PROMPTED_FILE,
  ensureFlowDir,
  getLocalVersion,
  commandExists,
  runCommand,
  GITHUB_REPO,
} from './utils.js';

export async function showNotification(): Promise<void> {
  ensureFlowDir();

  const hasUpdate = existsSync(NOTIFY_FILE);
  const hasPromptedStar = existsSync(STAR_PROMPTED_FILE);

  if (!hasUpdate && hasPromptedStar) {
    return;
  }

  if (!existsSync(ONBOARDING_SHOWN_FILE)) {
    printOnboarding();
    writeFileSync(ONBOARDING_SHOWN_FILE, new Date().toISOString());
  }

  if (hasUpdate) {
    const updateInfo = readFileSync(NOTIFY_FILE, 'utf8').trim();
    console.log('');
    console.log(`  ${updateInfo}`);
    console.log('');

    const wantsUpdate = await askYesNo(`  Update now with npm update -g ${PACKAGE_NAME}? (y/n): `);
    if (wantsUpdate) {
      const result = await runCommand(`npm update -g ${PACKAGE_NAME}`);
      if (result.code === 0) {
        console.log('  ✅ Update finished successfully.');
      } else {
        console.log(`  ⚠️  Update failed. Run manually: npm update -g ${PACKAGE_NAME}`);
      }
    }

    try {
      unlinkSync(NOTIFY_FILE);
    } catch {
      // ignore cleanup errors
    }
    console.log('');
  }

  if (!hasPromptedStar) {
    const alreadyStarred = await isAlreadyStarred();
    if (alreadyStarred === true) {
      console.log('  ⭐ GitHub repository already starred. Thank you!');
    } else if (alreadyStarred === false) {
      const wantsStar = await askYesNo(`  ⭐ Star ${APP_NAME} on GitHub? (y/n): `);
      if (wantsStar) {
        await handleStar();
      } else {
        console.log(`  ℹ️  You can star it later: ${REPO_URL}`);
      }
    } else {
      console.log(`  ℹ️  GitHub star status unavailable. Star here: ${REPO_URL}`);
    }

    writeFileSync(STAR_PROMPTED_FILE, new Date().toISOString());
    console.log('');
  }
}

async function isAlreadyStarred(): Promise<boolean | null> {
  const hasGh = await commandExists('gh');
  if (!hasGh) {
    return null;
  }

  const authStatus = await runCommand('gh auth status');
  if (authStatus.code !== 0) {
    return null;
  }

  const checkResult = await runCommand(`gh api user/starred/${GITHUB_REPO}`);
  return checkResult.code === 0;
}

async function handleStar(): Promise<void> {
  const hasGh = await commandExists('gh');
  if (!hasGh) {
    console.log(`  ℹ️  gh CLI is not installed. Star here: ${REPO_URL}`);
    return;
  }

  const authStatus = await runCommand('gh auth status');
  if (authStatus.code !== 0) {
    console.log(`  ℹ️  gh is not authenticated. Star here: ${REPO_URL}`);
    return;
  }

  const starResult = await runCommand(`gh api -X PUT user/starred/${GITHUB_REPO}`);
  if (starResult.code === 0) {
    console.log('  ⭐ Starred successfully. Thank you!');
  } else {
    console.log(`  ⚠️  Could not star automatically. Star here: ${REPO_URL}`);
  }
}

function askYesNo(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function printOnboarding(): void {
  const version = getLocalVersion();
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  🎮 ${APP_NAME} v${version}${' '.repeat(Math.max(0, 34 - version.length))}║`);
  console.log('║                                                      ║');
  console.log('║  CLI-first Godot automation for humans and agents    ║');
  console.log('║                                                      ║');
  console.log(`║  📖 Docs:   ${REPO_URL.padEnd(39)}║`);
  console.log(`║  ⭐ Star:   ${`${APP_NAME} star`.padEnd(39)}║`);
  console.log(`║  🔄 Update: ${`npm update -g ${PACKAGE_NAME}`.padEnd(39)}║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
}
