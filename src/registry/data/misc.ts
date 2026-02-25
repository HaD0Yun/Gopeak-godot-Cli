import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const miscTools: FunctionDefinition[] = [
  {
    name: "capture_intent_snapshot",
    description: "Capture/update an intent snapshot for current work (goal, constraints, acceptance criteria) and persist it for handoff.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "goal": {
                "type": "string",
                "description": "Primary goal of the current work."
            },
            "why": {
                "type": "string",
                "description": "Why this work matters."
            },
            "constraints": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Operational/technical constraints."
            },
            "acceptanceCriteria": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Definition of done."
            },
            "nonGoals": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Out of scope items."
            },
            "priority": {
                "type": "string",
                "description": "Priority label (e.g., P0, P1)."
            }
        },
        "required": [
            "projectPath",
            "goal"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "export_handoff_pack",
    description: "Export a machine-readable handoff pack combining intent, decisions, and execution traces.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "maxItems": {
                "type": "number",
                "description": "Maximum decisions/traces to include. Default: 10"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "generate_handoff_brief",
    description: "Generate a handoff brief from saved intents, decisions, and execution traces for the next AI/operator.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "maxItems": {
                "type": "number",
                "description": "Max items per section. Default: 5"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "get_recording_mode",
    description: "Get current recording mode and queue status.",
    inputSchema: {
        "type": "object",
        "properties": {},
        "required": []
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "inspect_inheritance",
    description: "Inspect class inheritance hierarchy: ancestors, direct children, all descendants. Use to understand class relationships and find specialized alternatives.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "className": {
                "type": "string",
                "description": "Exact Godot class name to inspect"
            }
        },
        "required": [
            "projectPath",
            "className"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "query_class_info",
    description: "Get detailed information about a specific Godot class: methods, properties, signals, enums. Use to discover available properties before calling add_node/create_resource/set_node_properties, or to find methods before call_runtime_method.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "className": {
                "type": "string",
                "description": "Exact Godot class name (e.g., \"CharacterBody3D\", \"StandardMaterial3D\", \"AnimationPlayer\")"
            },
            "includeInherited": {
                "type": "boolean",
                "description": "If true, include inherited members from parent classes (default: false — shows only class-specific members)"
            }
        },
        "required": [
            "projectPath",
            "className"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "query_classes",
    description: "Query available Godot classes from ClassDB with filtering. Use to discover node types, resource types, or any class before using add_node/create_resource. Categories: node, node2d, node3d, control, resource, physics, physics2d, audio, visual, animation.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "filter": {
                "type": "string",
                "description": "Optional: substring filter for class names (case-insensitive, e.g., \"light\", \"collision\")"
            },
            "category": {
                "type": "string",
                "description": "Optional: filter by category (node, node2d, node3d, control, resource, physics, physics2d, audio, visual, animation)"
            },
            "instantiableOnly": {
                "type": "boolean",
                "description": "If true, only return classes that can be instantiated (default: false)"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "record_decision_log",
    description: "Record a structured decision log entry with rationale and alternatives.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "intentId": {
                "type": "string",
                "description": "Related intent id. Optional if latest intent should be inferred."
            },
            "decision": {
                "type": "string",
                "description": "Decision statement."
            },
            "rationale": {
                "type": "string",
                "description": "Why this decision was made."
            },
            "alternativesRejected": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Alternatives considered and rejected."
            },
            "evidenceRefs": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "References supporting the decision."
            }
        },
        "required": [
            "projectPath",
            "decision"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "record_execution_trace",
    description: "Record execution trace for a work step (command/tool, files changed, result, artifacts).",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "intentId": {
                "type": "string",
                "description": "Related intent id. Optional: auto-link active intent."
            },
            "action": {
                "type": "string",
                "description": "Executed action name."
            },
            "command": {
                "type": "string",
                "description": "Command or tool invocation."
            },
            "filesChanged": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Changed file paths."
            },
            "result": {
                "type": "string",
                "description": "success|failed|partial"
            },
            "artifact": {
                "type": "string",
                "description": "Artifact reference (branch, commit, build id)."
            },
            "error": {
                "type": "string",
                "description": "Error details when failed."
            }
        },
        "required": [
            "projectPath",
            "action",
            "result"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "record_work_step",
    description: "Unified operation: records execution trace and optionally refreshes handoff pack in one call.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "intentId": {
                "type": "string",
                "description": "Related intent id. Optional: auto-link active intent."
            },
            "action": {
                "type": "string",
                "description": "Executed action name."
            },
            "command": {
                "type": "string",
                "description": "Command or tool invocation."
            },
            "filesChanged": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Changed file paths."
            },
            "result": {
                "type": "string",
                "description": "success|failed|partial"
            },
            "artifact": {
                "type": "string",
                "description": "Artifact reference (branch, commit, build id)."
            },
            "error": {
                "type": "string",
                "description": "Error details when failed."
            },
            "refreshHandoffPack": {
                "type": "boolean",
                "description": "If true, regenerates handoff pack after recording. Default: true"
            },
            "maxItems": {
                "type": "number",
                "description": "Max items for refreshed handoff pack. Default: 10"
            }
        },
        "required": [
            "projectPath",
            "action",
            "result"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "set_recording_mode",
    description: "Set recording mode: lite (minimal overhead) or full (richer context).",
    inputSchema: {
        "type": "object",
        "properties": {
            "mode": {
                "type": "string",
                "description": "lite|full"
            }
        },
        "required": [
            "mode"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  },
  {
    name: "summarize_intent_context",
    description: "Summarize current intent context (goal, open decisions, risks, next actions) in compact form.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Misc,
    executionPath: "headless",
  }
];
