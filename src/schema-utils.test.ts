import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonSchemaToZod } from './schema-utils.js';

test('jsonSchemaToZod builds object schemas with required and optional fields', () => {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      name: { type: 'string' },
      retries: { type: 'integer' },
      enabled: { type: 'boolean' },
    },
    required: ['name', 'enabled'],
  });

  const parsed = schema.parse({ name: 'agent', enabled: true });
  assert.deepEqual(parsed, { name: 'agent', enabled: true });

  const withOptional = schema.parse({ name: 'agent', enabled: false, retries: 3 });
  assert.deepEqual(withOptional, { name: 'agent', enabled: false, retries: 3 });

  assert.throws(() => schema.parse({ enabled: true }), /Required/);
  assert.throws(() => schema.parse({ name: 'agent', enabled: true, retries: 2.5 }), /integer/);
});

test('jsonSchemaToZod supports string enums and mixed literal unions', () => {
  const stringEnum = jsonSchemaToZod({ enum: ['headless', 'runtime'] });
  assert.equal(stringEnum.parse('runtime'), 'runtime');
  assert.throws(() => stringEnum.parse('dap'), /Invalid enum value/);

  const mixedEnum = jsonSchemaToZod({ enum: ['ok', 2, false, null] });
  assert.equal(mixedEnum.parse(2), 2);
  assert.equal(mixedEnum.parse(false), false);
  assert.equal(mixedEnum.parse(null), null);
  assert.throws(() => mixedEnum.parse(true), /Invalid input/);
});

test('jsonSchemaToZod handles array items and unknown fallbacks', () => {
  const arraySchema = jsonSchemaToZod({
    type: 'array',
    items: { type: 'number' },
  });

  assert.deepEqual(arraySchema.parse([1, 2, 3]), [1, 2, 3]);
  assert.throws(() => arraySchema.parse([1, '2']), /number/);

  const unknownSchema = jsonSchemaToZod({});
  const sample = { arbitrary: ['value'] };
  assert.equal(unknownSchema.parse(sample), sample);
});
