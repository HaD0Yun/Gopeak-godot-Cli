import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodError } from 'zod';
import { registry } from '../registry/index.js';
import { executeHeadless } from '../engine/headless.js';
import { executeRuntime } from '../engine/runtime.js';
import { executeLSP } from '../engine/lsp.js';
import { executeDAP } from '../engine/dap.js';
import { GodotFlowError } from '../errors.js';
import { jsonSchemaToZod } from '../schema-utils.js';
import { loadConfig } from '../config.js';
import { APP_VERSION } from '../version.js';
import type { DAPConfig, HeadlessConfig, LSPConfig, RuntimeConfig } from '../types/engine.js';

export const toolResult = (value: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
} => {
  const structured = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { data: value };

  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: structured,
  };
};

export function toToolError(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  if (error instanceof GodotFlowError) {
    return error.toMcpError();
  }

  if (error instanceof ZodError) {
    return new GodotFlowError('INVALID_ARGS', 'Invalid function arguments', {
      issues: error.issues,
    }).toMcpError();
  }

  return new GodotFlowError('EXECUTION_FAILED', error instanceof Error ? error.message : 'Unknown error').toMcpError();
}

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  configs: {
    headlessConfig: HeadlessConfig;
    runtimeConfig: RuntimeConfig;
    lspConfig: LSPConfig;
    dapConfig: DAPConfig;
  },
) {
  const fn = registry.get(name);
  if (!fn) {
    throw new GodotFlowError('FUNCTION_NOT_FOUND', `Function not found: ${name}`, { name });
  }

  const schema = fn.inputSchema as Parameters<typeof jsonSchemaToZod>[0];
  const validatedArgs = jsonSchemaToZod(schema).parse(args);
  if (typeof validatedArgs !== 'object' || validatedArgs === null || Array.isArray(validatedArgs)) {
    throw new GodotFlowError('INVALID_ARGS', 'Function arguments must resolve to an object', { name });
  }

  switch (fn.executionPath) {
    case 'headless':
      return executeHeadless(name, validatedArgs, configs.headlessConfig);
    case 'runtime':
      return executeRuntime(name, validatedArgs, configs.runtimeConfig);
    case 'lsp':
      return executeLSP(name, validatedArgs, configs.lspConfig);
    case 'dap':
      return executeDAP(name, validatedArgs, configs.dapConfig);
    default: {
      const unreachableExecutionPath: never = fn.executionPath;
      throw new GodotFlowError('REGISTRY_ERROR', 'Unsupported execution path', {
        executionPath: unreachableExecutionPath,
      });
    }
  }
}

export function createServer(): McpServer {
  const config = loadConfig();

  const headlessConfig: HeadlessConfig = {
    godotPath: config.godotPath,
    projectPath: config.projectPath,
    timeoutMs: config.timeoutMs,
  };

  const runtimeConfig: RuntimeConfig = {
    host: 'localhost',
    port: config.runtimePort,
    projectPath: config.projectPath,
    timeoutMs: config.timeoutMs,
  };

  const lspConfig: LSPConfig = {
    host: 'localhost',
    port: config.lspPort,
    projectPath: config.projectPath,
    timeoutMs: config.timeoutMs,
  };

  const dapConfig: DAPConfig = {
    host: 'localhost',
    port: config.dapPort,
    projectPath: config.projectPath,
    timeoutMs: config.timeoutMs,
  };

  const server = new McpServer({
    name: 'GopeakCLI',
    version: APP_VERSION,
  });

  server.tool(
    'Godot.listfunc',
    'List available GopeakCLI functions by optional category.',
    {
      category: z.string().optional(),
    },
    async (args) => {
      try {
        return toolResult(registry.list(args.category));
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.tool(
    'Godot.findfunc',
    'Search GopeakCLI functions by text pattern and optional category.',
    {
      pattern: z.string(),
      category: z.string().optional(),
    },
    async (args) => {
      try {
        return toolResult(registry.search(args.pattern, args.category));
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.tool(
    'Godot.viewfunc',
    'View full function definition including inputSchema for a specific function.',
    {
      name: z.string(),
    },
    async (args) => {
      try {
        const fn = registry.get(args.name);
        if (!fn) {
          throw new GodotFlowError('FUNCTION_NOT_FOUND', `Function not found: ${args.name}`, {
            name: args.name,
          });
        }

        return toolResult(fn);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.tool(
    'Godot.execute',
    'Execute a GopeakCLI function with validated arguments and engine routing.',
    {
      name: z.string(),
      args: z.record(z.unknown()).optional(),
    },
    async (args) => {
      try {
        const result = await executeFunction(args.name, args.args ?? {}, {
          headlessConfig,
          runtimeConfig,
          lspConfig,
          dapConfig,
        });

        return toolResult(result);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  return server;
}
