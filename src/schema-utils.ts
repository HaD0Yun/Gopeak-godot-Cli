import { z, type ZodTypeAny } from 'zod';

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
type JsonEnumValue = string | number | boolean | null;

type JsonSchema = {
  type?: JsonSchemaType;
  enum?: JsonEnumValue[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

function makeOptional(schema: ZodTypeAny): ZodTypeAny {
  return schema.optional();
}

export function jsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  if (schema.enum && schema.enum.length > 0) {
    const enumValues = schema.enum;
    if (enumValues.every((value) => typeof value === 'string')) {
      const values = enumValues as [string, ...string[]];
      return z.enum(values);
    }

    const literals = enumValues.map((value) => z.literal(value));
    const [firstLiteral, secondLiteral, ...restLiterals] = literals;
    if (!secondLiteral) {
      return firstLiteral;
    }
    return z.union([firstLiteral, secondLiteral, ...restLiterals]);
  }

  switch (schema.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'integer':
      return z.number().int();
    case 'boolean':
      return z.boolean();
    case 'array': {
      const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.unknown();
      return z.array(itemSchema);
    }
    case 'object': {
      const properties = schema.properties ?? {};
      const required = new Set(schema.required ?? []);
      const shape: Record<string, ZodTypeAny> = {};

      for (const [key, propertySchema] of Object.entries(properties)) {
        const propertyZod = jsonSchemaToZod(propertySchema);
        shape[key] = required.has(key) ? propertyZod : makeOptional(propertyZod);
      }

      return z.object(shape);
    }
    default:
      return z.unknown();
  }
}
