#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const readmePath = path.join(rootDir, 'README.md');
const benchmarkDir = path.join(rootDir, 'benchmark', 'evidence');
const benchmarkReportPath = path.join(benchmarkDir, 'benchmark-report.json');
const localFlowEvidencePath = path.join(benchmarkDir, 'godot-flow-tools-list.json');
const legacyEvidencePath = path.join(benchmarkDir, 'gopeak-legacy-tools-list.json');
const compactEvidencePath = path.join(benchmarkDir, 'gopeak-compact-tools-list.json');
const localServerEntry = path.join(rootDir, 'dist', 'mcp', 'index.js');
const shouldWrite = process.argv.includes('--write');
const TIMEOUT_MS = 15_000;

const INITIALIZE_REQUEST = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-readme-claims', version: '1.0.0' },
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatInt(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function computeEvidenceMetrics(response, label = 'response') {
  const tools = response?.result?.tools;
  assert(Array.isArray(tools), `Expected tools/list response in ${label}`);

  const raw = JSON.stringify(response);
  const payload = JSON.stringify(tools);

  return {
    toolCount: tools.length,
    responseChars: raw.length,
    responseBytes: Buffer.byteLength(raw, 'utf8'),
    toolsPayloadRaw: payload,
    toolsPayloadChars: payload.length,
    toolsPayloadBytes: Buffer.byteLength(payload, 'utf8'),
    toolsPayloadApproxTokens: Math.round(payload.length / 4),
  };
}

async function getLocalToolsListResponse() {
  assert(fs.existsSync(localServerEntry), `Build artifact not found at ${localServerEntry}. Run npm run build first.`);

  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [localServerEntry], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GODOT_FLOW_PROJECT_PATH: '', GODOT_PATH: '' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error(`Local MCP server timed out after ${TIMEOUT_MS}ms. stderr: ${stderr}`));
    }, TIMEOUT_MS);

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      proc.kill('SIGTERM');
      if (error) reject(error);
      else resolve(value);
    };

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.id === 2 && parsed.result) {
            finish(null, parsed);
            return;
          }
        } catch {
          // Wait for a full JSON line.
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => finish(new Error(`Failed to spawn local MCP server: ${error.message}`)));
    proc.on('exit', (code) => {
      if (!settled) {
        finish(new Error(`Local MCP server exited before responding (code ${code}). stderr: ${stderr}`));
      }
    });

    proc.stdin.write(`${INITIALIZE_REQUEST}\n`);
    setTimeout(() => {
      proc.stdin.write(`${INITIALIZED_NOTIFICATION}\n`);
      setTimeout(() => {
        proc.stdin.write(`${TOOLS_LIST_REQUEST}\n`);
      }, 200);
    }, 500);
  });
}

function verifyBenchmarkReport(report, expectedByProfile) {
  const mapping = {
    gopeakLegacy: expectedByProfile.legacy,
    gopeakCompact: expectedByProfile.compact,
    godotFlow: expectedByProfile.flow,
  };

  for (const [reportKey, expected] of Object.entries(mapping)) {
    const server = report.servers?.[reportKey];
    assert(server, `benchmark-report.json missing servers.${reportKey}`);
    assert(server.toolCount === expected.toolCount, `benchmark-report.json servers.${reportKey}.toolCount drifted`);
    assert(server.toolsPayload?.chars === expected.toolsPayloadChars, `benchmark-report.json servers.${reportKey}.toolsPayload.chars drifted`);
    assert(server.toolsPayload?.bytes === expected.toolsPayloadBytes, `benchmark-report.json servers.${reportKey}.toolsPayload.bytes drifted`);
    assert(server.toolsPayload?.approxTokens === expected.toolsPayloadApproxTokens, `benchmark-report.json servers.${reportKey}.toolsPayload.approxTokens drifted`);
    assert(server.fullResponse?.chars === expected.responseChars, `benchmark-report.json servers.${reportKey}.fullResponse.chars drifted`);
    assert(server.fullResponse?.bytes === expected.responseBytes, `benchmark-report.json servers.${reportKey}.fullResponse.bytes drifted`);
  }

  assert(report.reduction?.gopeakLegacyVsFlow, 'benchmark-report.json missing reduction.gopeakLegacyVsFlow');
  assert(report.reduction?.gopeakCompactVsFlow, 'benchmark-report.json missing reduction.gopeakCompactVsFlow');

  assert(
    report.reduction.gopeakLegacyVsFlow.charsX === round(expectedByProfile.legacy.toolsPayloadChars / expectedByProfile.flow.toolsPayloadChars, 2),
    'benchmark-report.json reduction.gopeakLegacyVsFlow.charsX drifted',
  );
  assert(
    report.reduction.gopeakLegacyVsFlow.bytesX === round(expectedByProfile.legacy.toolsPayloadBytes / expectedByProfile.flow.toolsPayloadBytes, 2),
    'benchmark-report.json reduction.gopeakLegacyVsFlow.bytesX drifted',
  );
  assert(
    report.reduction.gopeakLegacyVsFlow.tokensX === round(expectedByProfile.legacy.toolsPayloadApproxTokens / expectedByProfile.flow.toolsPayloadApproxTokens, 1),
    'benchmark-report.json reduction.gopeakLegacyVsFlow.tokensX drifted',
  );
  assert(
    report.reduction.gopeakCompactVsFlow.charsX === round(expectedByProfile.compact.toolsPayloadChars / expectedByProfile.flow.toolsPayloadChars, 2),
    'benchmark-report.json reduction.gopeakCompactVsFlow.charsX drifted',
  );
  assert(
    report.reduction.gopeakCompactVsFlow.bytesX === round(expectedByProfile.compact.toolsPayloadBytes / expectedByProfile.flow.toolsPayloadBytes, 2),
    'benchmark-report.json reduction.gopeakCompactVsFlow.bytesX drifted',
  );
  assert(
    report.reduction.gopeakCompactVsFlow.tokensX === round(expectedByProfile.compact.toolsPayloadApproxTokens / expectedByProfile.flow.toolsPayloadApproxTokens, 2),
    'benchmark-report.json reduction.gopeakCompactVsFlow.tokensX drifted',
  );
}

function applyReadmeClaims(readme, claims) {
  const replacements = [
    {
      pattern: /\*\*\d+ Godot functions through \d+ MCP meta-tools\. \d+ tokens instead of [\d,]+\.\*\*/,
      value: `**${claims.registryCount} Godot functions through ${claims.flowToolCount} MCP meta-tools. ${claims.flowTokens} tokens instead of ${formatInt(claims.legacyTokens)}.**`,
    },
    {
      pattern: /compresses \d+ individually-registered MCP tools into \d+ meta-tools — a \*\*\d+× token reduction\*\*/,
      value: `compresses ${claims.registryCount} individually-registered MCP tools into ${claims.flowToolCount} meta-tools — a **${claims.tokenReductionRounded}× token reduction**`,
    },
    {
      pattern: /> \*\*Successor to GoPeak\*\*: \d+ functions \(\d+ more than GoPeak's \d+\), same Godot integration depth, radically smaller context footprint\./,
      value: `> **Successor to GoPeak**: ${claims.registryCount} functions (${claims.registryCount - claims.legacyToolCount} more than GoPeak's ${claims.legacyToolCount}), same Godot integration depth, radically smaller context footprint.`,
    },
    {
      pattern: /\| 110\+ tool schemas loaded into every prompt \(~[\d,]+ tokens\) \| \d+ meta-tool schemas \(~\d+ tokens\) \|/,
      value: `| ${claims.legacyToolCount}+ tool schemas loaded into every prompt (~${formatInt(claims.legacyTokens)} tokens) | ${claims.flowToolCount} meta-tool schemas (~${claims.flowTokens} tokens) |`,
    },
    {
      pattern: /GoPeak \(legacy\)\s+\d+\s+[\d,]+\s+[\d,]+/,
      value: `GoPeak (legacy)      ${claims.legacyToolCount}      ${formatInt(claims.legacyChars)}       ${formatInt(claims.legacyTokens)}`,
    },
    {
      pattern: /GoPeak \(compact\)\s+\d+\s+[\d,]+\s+[\d,]+/,
      value: `GoPeak (compact)     ${claims.compactToolCount}       ${formatInt(claims.compactChars)}       ${formatInt(claims.compactTokens)}`,
    },
    {
      pattern: /godot-flow\s+\d+\s+[\d,]+\s+[\d,]+/,
      value: `godot-flow           ${claims.flowToolCount}        ${formatInt(claims.flowChars)}        ${formatInt(claims.flowTokens)}`,
    },
    {
      pattern: /Reduction: GoPeak legacy → godot-flow = \d+(?:\.\d+)?× fewer chars/,
      value: `Reduction: GoPeak legacy → godot-flow = ${claims.charReduction.toFixed(2)}× fewer chars`,
    },
    {
      pattern: /│  Function Registry: \d+ functions, \d+ categories │/,
      value: `│  Function Registry: ${claims.registryCount} functions, ${claims.categoryCount} categories │`,
    },
    {
      pattern: /## Function Reference \(\d+ functions, \d+ categories\)/,
      value: `## Function Reference (${claims.registryCount} functions, ${claims.categoryCount} categories)`,
    },
    {
      pattern: /\| \*\*Context cost\*\* \| ~[\d,]+ tokens per session \(measured\) \| ~\d+ tokens per session \(measured\) \|/,
      value: `| **Context cost** | ~${formatInt(claims.legacyTokens)} tokens per session (measured) | ~${claims.flowTokens} tokens per session (measured) |`,
    },
    {
      pattern: /\| \*\*Function count\*\* \| \d+ \| \d+ \|/,
      value: `| **Function count** | ${claims.legacyToolCount} | ${claims.registryCount} |`,
    },
    {
      pattern: /레지스트리에 등록된 \d+개 함수가 실제 GDScript/,
      value: `레지스트리에 등록된 ${claims.registryCount}개 함수가 실제 GDScript`,
    },
    {
      pattern: /- \*\*이름 유일성\*\*: \d+개 함수 이름에 중복이 없는지/,
      value: `- **이름 유일성**: ${claims.registryCount}개 함수 이름에 중복이 없는지`,
    },
    {
      pattern: /\| 레지스트리 함수 수 \| 정확히 \d+개 \|/,
      value: `| 레지스트리 함수 수 | 정확히 ${claims.registryCount}개 |`,
    },
  ];

  let updated = readme;
  for (const { pattern, value } of replacements) {
    assert(pattern.test(updated), `README pattern not found: ${pattern}`);
    updated = updated.replace(pattern, value);
  }

  return updated;
}

async function main() {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const benchmarkReport = readJson(benchmarkReportPath);
  const legacyMetrics = computeEvidenceMetrics(readJson(legacyEvidencePath), 'gopeak legacy evidence');
  const compactMetrics = computeEvidenceMetrics(readJson(compactEvidencePath), 'gopeak compact evidence');
  const committedFlowMetrics = computeEvidenceMetrics(readJson(localFlowEvidencePath), 'committed godot-flow evidence');
  const localFlowMetrics = computeEvidenceMetrics(await getLocalToolsListResponse(), 'local godot-flow server');

  assert(
    committedFlowMetrics.toolCount === localFlowMetrics.toolCount
      && committedFlowMetrics.toolsPayloadRaw === localFlowMetrics.toolsPayloadRaw
      && committedFlowMetrics.toolsPayloadChars === localFlowMetrics.toolsPayloadChars
      && committedFlowMetrics.toolsPayloadApproxTokens === localFlowMetrics.toolsPayloadApproxTokens,
    'Committed godot-flow benchmark evidence does not match the current built MCP server output.',
  );

  verifyBenchmarkReport(benchmarkReport, {
    legacy: legacyMetrics,
    compact: compactMetrics,
    flow: committedFlowMetrics,
  });

  const { registry } = await import(pathToFileURL(path.join(rootDir, 'dist', 'registry', 'index.js')).href);
  assert(registry, 'Failed to import dist/registry/index.js');

  const claims = {
    registryCount: registry.count(),
    categoryCount: registry.categories().length,
    legacyToolCount: legacyMetrics.toolCount,
    compactToolCount: compactMetrics.toolCount,
    flowToolCount: localFlowMetrics.toolCount,
    legacyChars: legacyMetrics.toolsPayloadChars,
    compactChars: compactMetrics.toolsPayloadChars,
    flowChars: localFlowMetrics.toolsPayloadChars,
    legacyTokens: legacyMetrics.toolsPayloadApproxTokens,
    compactTokens: compactMetrics.toolsPayloadApproxTokens,
    flowTokens: localFlowMetrics.toolsPayloadApproxTokens,
    charReduction: round(legacyMetrics.toolsPayloadChars / localFlowMetrics.toolsPayloadChars, 2),
    tokenReductionRounded: Math.round(legacyMetrics.toolsPayloadApproxTokens / localFlowMetrics.toolsPayloadApproxTokens),
  };

  const expectedReadme = applyReadmeClaims(readme, claims);

  if (shouldWrite && expectedReadme !== readme) {
    fs.writeFileSync(readmePath, expectedReadme);
    console.log('README claims updated from deterministic sources.');
  }

  const actualReadme = shouldWrite ? fs.readFileSync(readmePath, 'utf8') : readme;
  assert(expectedReadme === actualReadme, 'README claim drift detected. Run `npm run verify:claims -- --write`.');

  console.log('README claims verified successfully.');
  console.log(`- Registry functions: ${claims.registryCount}`);
  console.log(`- Registry categories: ${claims.categoryCount}`);
  console.log(`- godot-flow tools/tokens: ${claims.flowToolCount}/${claims.flowTokens}`);
  console.log(`- GoPeak legacy tools/tokens: ${claims.legacyToolCount}/${claims.legacyTokens}`);
  console.log(`- Legacy→flow char reduction: ${claims.charReduction.toFixed(2)}x`);
}

main().catch((error) => {
  console.error('[verify-readme-claims]', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
