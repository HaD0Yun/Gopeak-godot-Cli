import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const sourceDir = resolve(root, 'src/scripts');
const targetDir = resolve(root, 'dist/scripts');

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
