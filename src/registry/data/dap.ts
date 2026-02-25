import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const dapTools: FunctionDefinition[] = [
  {
    name: "dap_continue",
    description: "Continue execution after a breakpoint or pause",
    inputSchema: {
        "type": "object",
        "properties": {},
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_get_output",
    description: "Get captured Godot DAP console output lines",
    inputSchema: {
        "type": "object",
        "properties": {},
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_get_stack_trace",
    description: "Get the current stack trace from the Godot debugger",
    inputSchema: {
        "type": "object",
        "properties": {},
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_pause",
    description: "Pause execution of the running Godot debug target",
    inputSchema: {
        "type": "object",
        "properties": {},
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_remove_breakpoint",
    description: "Remove a breakpoint in a Godot script at a specific line",
    inputSchema: {
        "type": "object",
        "properties": {
            "scriptPath": {
                "type": "string",
                "description": "Absolute or project-relative script path"
            },
            "line": {
                "type": "number",
                "description": "1-based line number"
            }
        },
        "required": [
            "scriptPath",
            "line"
        ],
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_set_breakpoint",
    description: "Set a breakpoint in a Godot script at a specific line",
    inputSchema: {
        "type": "object",
        "properties": {
            "scriptPath": {
                "type": "string",
                "description": "Absolute or project-relative script path"
            },
            "line": {
                "type": "number",
                "description": "1-based line number"
            }
        },
        "required": [
            "scriptPath",
            "line"
        ],
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_step_over",
    description: "Step over the current line in the debugger",
    inputSchema: {
        "type": "object",
        "properties": {},
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_step_into",
    description: "Step into the current function call in the debugger",
    inputSchema: {
        "type": "object",
        "properties": {
            "threadId": {
                "type": "number",
                "description": "Optional positive thread id to control stepping"
            }
        },
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_step_out",
    description: "Step out of the current function in the debugger",
    inputSchema: {
        "type": "object",
        "properties": {
            "threadId": {
                "type": "number",
                "description": "Optional positive thread id to control stepping"
            }
        },
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  },
  {
    name: "dap_evaluate",
    description: "Evaluate an expression in the current debug context",
    inputSchema: {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Expression string to evaluate"
            },
            "threadId": {
                "type": "number",
                "description": "Optional positive thread id for evaluation context"
            },
            "frameId": {
                "type": "number",
                "description": "Optional non-negative frame id for evaluation context"
            }
        },
        "required": [
            "expression"
        ],
        "additionalProperties": false
    },
    category: FunctionCategory.DAP,
    executionPath: "dap",
  }
];
