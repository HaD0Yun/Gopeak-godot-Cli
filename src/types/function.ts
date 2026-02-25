import type { FunctionCategory } from './registry.js';

export type JsonSchemaObject = {
  type?: string | string[];
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaObject;
  items?: JsonSchemaObject | JsonSchemaObject[];
  enum?: Array<string | number | boolean | null>;
  description?: string;
  default?: unknown;
  oneOf?: JsonSchemaObject[];
  anyOf?: JsonSchemaObject[];
  allOf?: JsonSchemaObject[];
  [key: string]: unknown;
};

export interface FunctionDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
  category: FunctionCategory;
  executionPath: 'headless' | 'runtime' | 'lsp' | 'dap';
}
