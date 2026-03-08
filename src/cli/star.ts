import { APP_NAME, GITHUB_REPO, REPO_URL, commandExists, runCommand } from './utils.js';

export async function starGodotFlow(): Promise<void> {
  const hasGh = await commandExists('gh');
  if (!hasGh) {
    console.log(`ℹ️  gh CLI is not installed. Star ${APP_NAME} here: ${REPO_URL}`);
    return;
  }

  const authStatus = await runCommand('gh auth status');
  if (authStatus.code !== 0) {
    console.log(`ℹ️  gh is not authenticated. Star ${APP_NAME} here: ${REPO_URL}`);
    return;
  }

  const starStatus = await runCommand(`gh api user/starred/${GITHUB_REPO}`);
  if (starStatus.code === 0) {
    console.log('⭐ Already starred. Thank you!');
    return;
  }

  const starResult = await runCommand(`gh api -X PUT user/starred/${GITHUB_REPO}`);
  if (starResult.code === 0) {
    console.log('⭐ Repository starred successfully. Thank you!');
    return;
  }

  console.log(`⚠️  Could not star automatically. Star ${APP_NAME} here: ${REPO_URL}`);
}
