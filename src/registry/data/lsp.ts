import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const lspTools: FunctionDefinition[] = [
  {
    name: "lsp_completion",
    description: "Get code completions from Godot Language Server at a given position.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to Godot project root"
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to script relative to project root"
            },
            "line": {
                "type": "number",
                "description": "Zero-based line number"
            },
            "character": {
                "type": "number",
                "description": "Zero-based character offset"
            }
        },
        "required": [
            "projectPath",
            "scriptPath",
            "line",
            "character"
        ]
    },
    category: FunctionCategory.LSP,
    executionPath: "lsp",
  },
  {
    name: "lsp_diagnostics",
    description: "Get GDScript diagnostics from Godot Language Server for a script file.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to Godot project root"
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to script relative to project root"
            }
        },
        "required": [
            "projectPath",
            "scriptPath"
        ]
    },
    category: FunctionCategory.LSP,
    executionPath: "lsp",
  },
  {
    name: "lsp_hover",
    description: "Get hover information from Godot Language Server at a given position.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to Godot project root"
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to script relative to project root"
            },
            "line": {
                "type": "number",
                "description": "Zero-based line number"
            },
            "character": {
                "type": "number",
                "description": "Zero-based character offset"
            }
        },
        "required": [
            "projectPath",
            "scriptPath",
            "line",
            "character"
        ]
    },
    category: FunctionCategory.LSP,
    executionPath: "lsp",
  },
  {
    name: "lsp_goto_definition",
    description: "Get go-to-definition target from Godot Language Server at a given position.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to Godot project root"
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to script relative to project root"
            },
            "line": {
                "type": "number",
                "description": "Zero-based line number"
            },
            "character": {
                "type": "number",
                "description": "Zero-based character offset"
            }
        },
        "required": [
            "projectPath",
            "scriptPath",
            "line",
            "character"
        ]
    },
    category: FunctionCategory.LSP,
    executionPath: "lsp",
  }
];
