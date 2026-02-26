import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const themeTools: FunctionDefinition[] = [
  {
    name: "create_theme",
    description: "Creates a Theme resource (.tres) for UI styling. Optionally duplicates from an existing base theme. Use to define consistent look-and-feel for Controls (buttons, labels, panels, etc.).",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "themePath": {
                "type": "string",
                "description": "Path for new .tres file relative to project (e.g., \"themes/dark_ui.tres\")"
            },
            "baseThemePath": {
                "type": "string",
                "description": "Optional: path to existing theme to duplicate from. If empty, creates a blank theme."
            }
        },
        "required": [
            "projectPath",
            "themePath"
        ]
    },
    category: FunctionCategory.Theme,
    executionPath: "headless",
  },
  {
    name: "apply_theme_to_node",
    description: "Applies a Theme resource to a Control node in a scene. The theme will affect the node and all its Control children. Prerequisite: node must be a Control-derived type.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to the Control node in the scene (e.g., \"UI\", \"HUD/Panel\")"
            },
            "themePath": {
                "type": "string",
                "description": "Path to Theme resource relative to project (e.g., \"themes/dark_ui.tres\")"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "themePath"
        ]
    },
    category: FunctionCategory.Theme,
    executionPath: "headless",
  }
];
