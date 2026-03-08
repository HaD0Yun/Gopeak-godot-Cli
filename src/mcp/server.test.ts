import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError, z } from 'zod';
import { GodotFlowError } from '../errors.js';
import { toToolError, toolResult } from './server.js';

test('toolResult keeps object payloads structured and wraps primitives', () => {
  const objectResult = toolResult({ ok: true, nested: { count: 1 } });
  assert.deepEqual(objectResult.structuredContent, { ok: true, nested: { count: 1 } });
  assert.equal(objectResult.content[0]?.type, 'text');
  assert.match(objectResult.content[0]?.text ?? '', /"ok": true/);

  const primitiveResult = toolResult(42);
  assert.deepEqual(primitiveResult.structuredContent, { data: 42 });
});

test('toToolError preserves GodotFlowError MCP payloads', () => {
  const error = toToolError(new GodotFlowError('FUNCTION_NOT_FOUND', 'Missing function', { name: 'x' }));

  assert.equal(error.isError, true);
  assert.deepEqual(JSON.parse(error.content[0]?.text ?? '{}'), {
    error: {
      code: 'FUNCTION_NOT_FOUND',
      message: 'Missing function',
      details: { name: 'x' },
    },
  });
});

test('toToolError normalizes Zod validation errors to INVALID_ARGS', () => {
  const schema = z.object({ count: z.number() });
  let zodError: ZodError | undefined;

  try {
    schema.parse({ count: 'nope' });
  } catch (error) {
    zodError = error as ZodError;
  }

  assert.ok(zodError);
  const normalized = toToolError(zodError);
  const payload = JSON.parse(normalized.content[0]?.text ?? '{}');

  assert.equal(payload.error.code, 'INVALID_ARGS');
  assert.equal(payload.error.message, 'Invalid function arguments');
  assert.equal(Array.isArray(payload.error.details?.issues), true);
});

test('toToolError normalizes unknown failures to EXECUTION_FAILED', () => {
  const normalized = toToolError(new Error('kaboom'));
  const payload = JSON.parse(normalized.content[0]?.text ?? '{}');

  assert.deepEqual(payload, {
    error: {
      code: 'EXECUTION_FAILED',
      message: 'kaboom',
    },
  });
});
