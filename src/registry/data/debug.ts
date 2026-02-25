import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const debugTools: FunctionDefinition[] = [
  {
    name: "enforce_version_gate",
    description: "Checks Godot version and runtime addon protocol/capabilities against minimum requirements before risky operations.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "minGodotVersion": {
                "type": "string",
                "description": "Minimum required Godot version (major.minor). Default: 4.2"
            },
            "minProtocolVersion": {
                "type": "string",
                "description": "Minimum required runtime protocol version. Default: 1.0"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Debug,
    executionPath: "headless",
  },
  {
    name: "get_debug_output",
    description: "Retrieves console output and errors from the currently running Godot project. Use after run_project to check logs, errors, and print statements. Returns empty if no project is running.",
    inputSchema: {
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "description": "Brief explanation of why you are calling this tool"
            }
        },
        "required": [
            "reason"
        ]
    },
    category: FunctionCategory.Debug,
    executionPath: "runtime",
  },
  {
    name: "parse_error_log",
    description: "Parses Godot error log and provides fix suggestions. Use to diagnose runtime errors or script issues.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "logContent": {
                "type": "string",
                "description": "Optional: error log text. If omitted, reads from godot.log"
            },
            "maxErrors": {
                "type": "number",
                "description": "Maximum errors to return. Default: 50"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Debug,
    executionPath: "headless",
  },
  {
    name: "validate_patch_with_lsp",
    description: "Runs Godot LSP diagnostics for a script and returns whether it is safe to apply changes. Intended as a pre-apply quality gate.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "scriptPath": {
                "type": "string",
                "description": "Script path relative to project (e.g., scripts/player.gd)."
            }
        },
        "required": [
            "projectPath",
            "scriptPath"
        ]
    },
    category: FunctionCategory.Debug,
    executionPath: "headless",
  }
];
