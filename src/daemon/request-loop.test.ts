import assert from 'node:assert/strict';
import test from 'node:test';
import { GodotFlowError } from '../errors.js';
import { runRequestLoop } from './request-loop.js';

test('runRequestLoop returns INVALID_ARGS when request JSON is malformed', async () => {
  const response = await runRequestLoop('{"action":', async () => ({ data: { ok: true } }));

  assert.equal(response.success, false);
  if (response.success) {
    assert.fail('response should be failure');
  }

  assert.equal(response.error.code, 'INVALID_ARGS');
  assert.match(response.error.message, /^Invalid JSON request:/);
});

test('runRequestLoop rejects non-object JSON payloads', async () => {
  const response = await runRequestLoop('[1,2,3]', async () => ({ ok: true }));

  assert.equal(response.success, false);
  if (response.success) {
    assert.fail('response should be failure');
  }

  assert.deepEqual(response.error, {
    code: 'INVALID_ARGS',
    message: 'IPC request must be a JSON object',
  });
});

test('runRequestLoop returns success payloads with success flag', async () => {
  const response = await runRequestLoop('{"action":"ping"}', async (request) => ({
    echoedAction: request.action,
    nested: { ok: true },
  }));

  assert.equal(response.success, true);
  if (!response.success) {
    assert.fail('response should be success');
  }

  assert.equal(response.echoedAction, 'ping');
  assert.deepEqual(response.nested, { ok: true });
});

test('runRequestLoop preserves GodotFlowError code and details', async () => {
  const response = await runRequestLoop('{"action":"fail"}', async () => {
    throw new GodotFlowError('ENGINE_TIMEOUT', 'Timed out', { timeoutMs: 1234 });
  });

  assert.equal(response.success, false);
  if (response.success) {
    assert.fail('response should be failure');
  }

  assert.deepEqual(response.error, {
    code: 'ENGINE_TIMEOUT',
    message: 'Timed out',
    details: { timeoutMs: 1234 },
  });
});

test('runRequestLoop normalizes unknown errors to EXECUTION_FAILED', async () => {
  const response = await runRequestLoop('{"action":"explode"}', async () => {
    throw 'boom';
  });

  assert.equal(response.success, false);
  if (response.success) {
    assert.fail('response should be failure');
  }

  assert.deepEqual(response.error, {
    code: 'EXECUTION_FAILED',
    message: 'boom',
    details: undefined,
  });
});
