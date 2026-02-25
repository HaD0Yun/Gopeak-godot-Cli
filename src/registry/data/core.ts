import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const coreTools: FunctionDefinition[] = [
  {
    name: "launch_editor",
    description: "Opens the Godot editor GUI for a project. Use when visual inspection or manual editing of scenes/scripts is needed. Opens a new window on the host system. Requires: project directory with project.godot file.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Core,
    executionPath: "runtime",
  },
  {
    name: "run_project",
    description: "Launches a Godot project in a new window and captures output. Use to test gameplay or verify script behavior. Runs until stop_project is called. Use get_debug_output to retrieve logs.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scene": {
                "type": "string",
                "description": "Optional: specific scene to run (e.g., \"scenes/TestLevel.tscn\"). If omitted, runs main scene from project settings."
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Core,
    executionPath: "runtime",
  },
  {
    name: "stop_project",
    description: "Terminates the currently running Godot project process. Use to stop a project started with run_project. No effect if no project is running.",
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
    category: FunctionCategory.Core,
    executionPath: "runtime",
  }
];
