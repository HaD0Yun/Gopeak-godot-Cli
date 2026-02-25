#!/usr/bin/env npx tsx
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

type ToolRecord = {
  name?: unknown;
  executionPath?: unknown;
};

const DEFAULT_GDSCRIPT_PATH = '/home/doyun/godot-mcp/src/scripts/godot_operations.gd';
const DEFAULT_EXPECTED_REGISTRY_ONLY = 21;
const DEFAULT_EXPECTED_GDSCRIPT_ONLY = 18;

function parseExpectedCount(rawValue: string | undefined, fallback: number): number {
  if (rawValue === undefined) {
    return fallback;
  }

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseGdscriptOperations(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const matchLineIndex = lines.findIndex((line) => /^\s*match\s+operation\s*:\s*$/.test(line));

  if (matchLineIndex < 0) {
    return [];
  }

  const matchIndent = lines[matchLineIndex].length - lines[matchLineIndex].trimStart().length;
  const caseIndent = matchIndent + 4;
  const operationNames = new Set<string>();

  for (let index = matchLineIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const currentIndent = line.length - line.trimStart().length;
    if (currentIndent <= matchIndent) {
      break;
    }

    if (currentIndent !== caseIndent) {
      continue;
    }

    const caseMatch = trimmed.match(/^"([^"]+)"\s*:/) ?? trimmed.match(/^'([^']+)'\s*:/);
    if (caseMatch?.[1] && caseMatch[1] !== '_') {
      operationNames.add(caseMatch[1]);
    }
  }

  return Array.from(operationNames).sort((left, right) => left.localeCompare(right));
}

async function loadHeadlessRegistryTools(projectRoot: string): Promise<string[]> {
  const indexPath = resolve(projectRoot, 'src/registry/data/index.ts');
  const imported = await import(pathToFileURL(indexPath).href) as { allTools?: ToolRecord[] };

  if (!Array.isArray(imported.allTools)) {
    throw new Error('Failed to load allTools from src/registry/data/index.ts');
  }

  const names = imported.allTools
    .filter((tool) => tool.executionPath === 'headless' && typeof tool.name === 'string')
    .map((tool) => tool.name as string);

  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
}

function findMissing(source: readonly string[], target: ReadonlySet<string>): string[] {
  return source.filter((value) => !target.has(value));
}

function printSection(title: string, entries: readonly string[]): void {
  console.log(`\n${title} (${entries.length})`);
  if (entries.length === 0) {
    console.log('  - none');
    return;
  }

  for (const entry of entries) {
    console.log(`  - ${entry}`);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve(process.env.GODOT_FLOW_ROOT ?? process.cwd());
  const expectedRegistryOnly = parseExpectedCount(
    process.env.EXPECTED_REGISTRY_ONLY,
    DEFAULT_EXPECTED_REGISTRY_ONLY,
  );
  const expectedGdscriptOnly = parseExpectedCount(
    process.env.EXPECTED_GDSCRIPT_ONLY,
    DEFAULT_EXPECTED_GDSCRIPT_ONLY,
  );

  const inputPath = process.argv[2] ?? process.env.GODOT_OPERATIONS_PATH ?? DEFAULT_GDSCRIPT_PATH;
  const gdscriptPath = resolve(inputPath);

  if (!existsSync(gdscriptPath)) {
    console.error(`[validate-registry] GDScript file not found: ${gdscriptPath}`);
    process.exit(1);
  }

  const gdscriptContents = readFileSync(gdscriptPath, 'utf8');
  const gdscriptOperations = parseGdscriptOperations(gdscriptContents);

  if (gdscriptOperations.length === 0) {
    console.error('[validate-registry] No operations were parsed from the match operation block.');
    process.exit(1);
  }

  const registryHeadlessTools = await loadHeadlessRegistryTools(projectRoot);
  if (registryHeadlessTools.length === 0) {
    console.error('[validate-registry] No headless tools were found in registry data.');
    process.exit(1);
  }

  const gdscriptSet = new Set(gdscriptOperations);
  const registrySet = new Set(registryHeadlessTools);

  const registryOnly = findMissing(registryHeadlessTools, gdscriptSet);
  const gdscriptOnly = findMissing(gdscriptOperations, registrySet);

  const isAcceptable =
    registryOnly.length === expectedRegistryOnly && gdscriptOnly.length === expectedGdscriptOnly;

  console.log('=== Registry vs godot_operations.gd Validation ===');
  console.log(`Project root: ${projectRoot}`);
  console.log(`GDScript path: ${gdscriptPath}`);
  console.log(`Headless registry tools: ${registryHeadlessTools.length}`);
  console.log(`GDScript match/case operations: ${gdscriptOperations.length}`);
  console.log(
    `Expected mismatch counts (registry-only/gdscript-only): ${expectedRegistryOnly}/${expectedGdscriptOnly}`,
  );

  printSection('Registry-only headless functions', registryOnly);
  printSection('GDScript-only operations', gdscriptOnly);

  if (isAcceptable) {
    console.log('\nResult: ACCEPTABLE mismatch profile (exit 0).');
    return;
  }

  console.error('\nResult: CRITICAL mismatch profile detected (exit 1).');
  console.error(
    `Observed mismatch counts (registry-only/gdscript-only): ${registryOnly.length}/${gdscriptOnly.length}`,
  );
  process.exit(1);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error('[validate-registry] Unexpected failure:', message);
  process.exit(1);
});
