#!/usr/bin/env node
/**
 * benchmark-tokens.ts
 *
 * Spawns GoPeak and godot-flow MCP servers, sends tools/list via JSON-RPC,
 * measures actual response sizes, and produces a comparison report.
 *
 * Usage:
 *   npx tsx scripts/benchmark-tokens.ts
 *
 * Output:
 *   - benchmark/evidence/gopeak-tools-list.json
 *   - benchmark/evidence/godot-flow-tools-list.json
 *   - benchmark/evidence/benchmark-report.json
 *   - Comparison table to stdout
 */

import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────────────────

const GOPEAK_CMD = 'node';
const GOPEAK_ARGS = [path.resolve('/home/doyun/godot-mcp/build/index.js')];

const FLOW_CMD = 'node';
const FLOW_ARGS = [path.resolve('/home/doyun/godot-flow/dist/mcp/index.js')];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVIDENCE_DIR = path.resolve(__dirname, '..', 'benchmark', 'evidence');
const TIMEOUT_MS = 15_000;

// ── JSON-RPC helpers ────────────────────────────────────────────────

const INITIALIZE_REQUEST = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'benchmark', version: '1.0.0' },
  },
});

const INITIALIZED_NOTIFICATION = JSON.stringify({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
});

const TOOLS_LIST_REQUEST = JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
});

interface ToolSchema {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ToolsListResult {
  tools: ToolSchema[];
}

interface ServerMetrics {
  serverName: string;
  command: string;
  toolCount: number;
  responseRaw: string;
  responseBytes: number;
  responseChars: number;
  approxTokens: number;
  toolsPayloadRaw: string;
  toolsPayloadBytes: number;
  toolsPayloadChars: number;
  toolsPayloadApproxTokens: number;
  toolSizes: Array<{ name: string; chars: number; bytes: number }>;
}

// ── Core: spawn server and get tools/list ───────────────────────────

function getToolsListFromServer(
  serverName: string,
  cmd: string,
  args: string[],
  extraEnv: Record<string, string> = {},
): Promise<ServerMetrics> {
  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GODOT_FLOW_PROJECT_PATH: '', GODOT_PATH: '', ...extraEnv },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGKILL');
        reject(new Error(`${serverName}: timeout after ${TIMEOUT_MS}ms. stderr: ${stderr}`));
      }
    }, TIMEOUT_MS);

    proc.stdout!.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();

      // Look for tools/list response (id: 2)
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.id === 2 && parsed.result) {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              proc.kill('SIGTERM');

              const result = parsed.result as ToolsListResult;
              const tools = result.tools || [];

              // Full JSON-RPC response metrics
              const responseRaw = trimmed;
              const responseBytes = Buffer.byteLength(responseRaw, 'utf8');
              const responseChars = responseRaw.length;

              // Tools payload only (what AI actually sees)
              const toolsPayloadRaw = JSON.stringify(tools);
              const toolsPayloadBytes = Buffer.byteLength(toolsPayloadRaw, 'utf8');
              const toolsPayloadChars = toolsPayloadRaw.length;

              // Per-tool sizes
              const toolSizes = tools.map((t) => {
                const s = JSON.stringify(t);
                return {
                  name: t.name,
                  chars: s.length,
                  bytes: Buffer.byteLength(s, 'utf8'),
                };
              });

              resolve({
                serverName,
                command: `${cmd} ${args.join(' ')}`,
                toolCount: tools.length,
                responseRaw,
                responseBytes,
                responseChars,
                approxTokens: Math.round(responseChars / 4),
                toolsPayloadRaw,
                toolsPayloadBytes,
                toolsPayloadChars,
                toolsPayloadApproxTokens: Math.round(toolsPayloadChars / 4),
                toolSizes,
              });
            }
          }
        } catch {
          // Not valid JSON yet, keep buffering
        }
      }
    });

    proc.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`${serverName}: spawn error: ${err.message}`));
      }
    });

    proc.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(
          new Error(
            `${serverName}: exited with code ${code} before tools/list response. stderr: ${stderr}`,
          ),
        );
      }
    });

    // Send the 3 messages
    proc.stdin!.write(INITIALIZE_REQUEST + '\n');
    // Small delay to let server process initialize
    setTimeout(() => {
      proc.stdin!.write(INITIALIZED_NOTIFICATION + '\n');
      setTimeout(() => {
        proc.stdin!.write(TOOLS_LIST_REQUEST + '\n');
      }, 200);
    }, 500);
  });
}

// ── Statistics helpers ──────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function computeDistribution(sizes: Array<{ name: string; chars: number }>) {
  const values = sizes.map((s) => s.chars).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: values[0],
    max: values[values.length - 1],
    mean: Math.round(sum / values.length),
    median: Math.round(percentile(values, 50)),
    p90: Math.round(percentile(values, 90)),
    total: sum,
    top5: sizes
      .sort((a, b) => b.chars - a.chars)
      .slice(0, 5)
      .map((s) => ({ name: s.name, chars: s.chars })),
    bottom5: sizes
      .sort((a, b) => a.chars - b.chars)
      .slice(0, 5)
      .map((s) => ({ name: s.name, chars: s.chars })),
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   MCP Token Benchmark: GoPeak vs godot-flow                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  // ── 1. GoPeak legacy mode (all tools) ──
  console.log('► [1/3] GoPeak (legacy = all tools)...');
  let gopeakLegacy: ServerMetrics;
  try {
    gopeakLegacy = await getToolsListFromServer(
      'GoPeak (legacy)', GOPEAK_CMD, GOPEAK_ARGS,
      { GOPEAK_TOOL_PROFILE: 'legacy', GOPEAK_TOOLS_PAGE_SIZE: '9999' },
    );
    console.log(`  ✓ ${gopeakLegacy.toolCount} tools`);
  } catch (err) {
    console.error(`  ✗ Failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── 2. GoPeak compact mode (default) ──
  console.log('► [2/3] GoPeak (compact = default)...');
  let gopeakCompact: ServerMetrics;
  try {
    gopeakCompact = await getToolsListFromServer(
      'GoPeak (compact)', GOPEAK_CMD, GOPEAK_ARGS,
      { GOPEAK_TOOL_PROFILE: 'compact', GOPEAK_TOOLS_PAGE_SIZE: '9999' },
    );
    console.log(`  ✓ ${gopeakCompact.toolCount} tools`);
  } catch (err) {
    console.error(`  ✗ Failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── 3. godot-flow ──
  console.log('► [3/3] godot-flow (4 meta-tools)...');
  let flow: ServerMetrics;
  try {
    flow = await getToolsListFromServer('godot-flow', FLOW_CMD, FLOW_ARGS);
    console.log(`  ✓ ${flow.toolCount} tools`);
  } catch (err) {
    console.error(`  ✗ Failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Save evidence ──
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'gopeak-legacy-tools-list.json'), gopeakLegacy.responseRaw, 'utf8');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'gopeak-compact-tools-list.json'), gopeakCompact.responseRaw, 'utf8');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'godot-flow-tools-list.json'), flow.responseRaw, 'utf8');
  console.log(`\n► Evidence saved to ${EVIDENCE_DIR}/`);

  // ── Compute reductions ──
  const legacyVsFlow = {
    chars: gopeakLegacy.toolsPayloadChars / flow.toolsPayloadChars,
    bytes: gopeakLegacy.toolsPayloadBytes / flow.toolsPayloadBytes,
    tokens: gopeakLegacy.toolsPayloadApproxTokens / flow.toolsPayloadApproxTokens,
  };
  const compactVsFlow = {
    chars: gopeakCompact.toolsPayloadChars / flow.toolsPayloadChars,
    bytes: gopeakCompact.toolsPayloadBytes / flow.toolsPayloadBytes,
    tokens: gopeakCompact.toolsPayloadApproxTokens / flow.toolsPayloadApproxTokens,
  };

  // ── Distributions ──
  const legacyDist = computeDistribution(gopeakLegacy.toolSizes);
  const compactDist = computeDistribution(gopeakCompact.toolSizes);
  const flowDist = computeDistribution(flow.toolSizes);

  // ── Build report ──
  const report = {
    timestamp: new Date().toISOString(),
    method: 'Actual MCP JSON-RPC tools/list response measurement via stdio',
    tokenEstimation: 'chars / 4 (GPT-family approximation)',
    servers: {
      gopeakLegacy: {
        profile: 'legacy (all tools)',
        toolCount: gopeakLegacy.toolCount,
        toolsPayload: { bytes: gopeakLegacy.toolsPayloadBytes, chars: gopeakLegacy.toolsPayloadChars, approxTokens: gopeakLegacy.toolsPayloadApproxTokens },
        fullResponse: { bytes: gopeakLegacy.responseBytes, chars: gopeakLegacy.responseChars },
        distribution: legacyDist,
      },
      gopeakCompact: {
        profile: 'compact (default)',
        toolCount: gopeakCompact.toolCount,
        toolsPayload: { bytes: gopeakCompact.toolsPayloadBytes, chars: gopeakCompact.toolsPayloadChars, approxTokens: gopeakCompact.toolsPayloadApproxTokens },
        fullResponse: { bytes: gopeakCompact.responseBytes, chars: gopeakCompact.responseChars },
        distribution: compactDist,
      },
      godotFlow: {
        profile: '4 meta-tools',
        toolCount: flow.toolCount,
        toolsPayload: { bytes: flow.toolsPayloadBytes, chars: flow.toolsPayloadChars, approxTokens: flow.toolsPayloadApproxTokens },
        fullResponse: { bytes: flow.responseBytes, chars: flow.responseChars },
        distribution: flowDist,
      },
    },
    reduction: {
      gopeakLegacyVsFlow: { charsX: n(legacyVsFlow.chars), bytesX: n(legacyVsFlow.bytes), tokensX: n(legacyVsFlow.tokens) },
      gopeakCompactVsFlow: { charsX: n(compactVsFlow.chars), bytesX: n(compactVsFlow.bytes), tokensX: n(compactVsFlow.tokens) },
    },
  };
  const reportPath = path.join(EVIDENCE_DIR, 'benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  // ── Print results ──
  const W = 80;
  const sep = '─'.repeat(W);
  const dsep = '═'.repeat(W);
  console.log('\n');
  console.log(dsep);
  console.log('  BENCHMARK RESULTS — tools/list payload comparison');
  console.log(dsep);
  console.log('');
  console.log('  Measurement: JSON.stringify(tools[]) from tools/list JSON-RPC response');
  console.log('  Token estimate: chars ÷ 4 (GPT-family approximation)');
  console.log('');
  console.log(sep);
  printRow('Server', 'Tools', 'Chars', 'Bytes', 'Tokens~');
  console.log(sep);
  printRow('GoPeak (legacy)',  gopeakLegacy.toolCount, gopeakLegacy.toolsPayloadChars, gopeakLegacy.toolsPayloadBytes, gopeakLegacy.toolsPayloadApproxTokens);
  printRow('GoPeak (compact)', gopeakCompact.toolCount, gopeakCompact.toolsPayloadChars, gopeakCompact.toolsPayloadBytes, gopeakCompact.toolsPayloadApproxTokens);
  printRow('godot-flow',       flow.toolCount, flow.toolsPayloadChars, flow.toolsPayloadBytes, flow.toolsPayloadApproxTokens);
  console.log(sep);
  console.log('');

  // Reduction
  console.log('  Reduction (tools payload):');
  console.log(`    GoPeak legacy  → godot-flow: ${legacyVsFlow.chars.toFixed(2)}× chars, ${legacyVsFlow.tokens.toFixed(2)}× tokens`);
  console.log(`    GoPeak compact → godot-flow: ${compactVsFlow.chars.toFixed(2)}× chars, ${compactVsFlow.tokens.toFixed(2)}× tokens`);
  console.log('');

  // GoPeak legacy distribution
  console.log(sep);
  console.log('  GoPeak legacy — per-tool schema size distribution (chars):');
  console.log(sep);
  console.log(`    Count:  ${legacyDist.count}`);
  console.log(`    Min:    ${legacyDist.min}`);
  console.log(`    Max:    ${legacyDist.max}`);
  console.log(`    Mean:   ${legacyDist.mean}`);
  console.log(`    Median: ${legacyDist.median}`);
  console.log(`    P90:    ${legacyDist.p90}`);
  console.log('');
  console.log('    Top 5 largest:');
  for (const t of legacyDist.top5) {
    console.log(`      ${pad(t.name, 40)} ${t.chars} chars`);
  }
  console.log('    Bottom 5 smallest:');
  for (const t of legacyDist.bottom5) {
    console.log(`      ${pad(t.name, 40)} ${t.chars} chars`);
  }
  console.log('');

  // Summary
  console.log(dsep);
  console.log(`  RESULT: godot-flow uses ${legacyVsFlow.chars.toFixed(2)}× fewer characters`);
  console.log(`          vs GoPeak legacy (${gopeakLegacy.toolsPayloadChars.toLocaleString()} → ${flow.toolsPayloadChars.toLocaleString()} chars)`);
  console.log(`          ${gopeakLegacy.toolCount} tools → ${flow.toolCount} meta-tools`);
  console.log(dsep);
  console.log(`\n  Report: ${reportPath}`);
  }

    function n(v: number): number { return Number(v.toFixed(2)); }

  function pad(val: string | number, width = 17): string {
  const s = String(val);
  return s + ' '.repeat(Math.max(0, width - s.length));
}

  function printRow(label: string, tools: number | string, chars: number | string, bytes: number | string, tokens: number | string) {
  console.log(`  ${pad(label, 20)} ${pad(tools, 8)} ${pad(chars, 12)} ${pad(bytes, 12)} ${pad(tokens, 10)}`);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
