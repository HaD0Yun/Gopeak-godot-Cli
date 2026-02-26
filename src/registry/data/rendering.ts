import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const renderingTools: FunctionDefinition[] = [
  {
    name: "create_environment",
    description: "Creates an Environment resource (.tres) for 3D rendering settings. Configures background mode (sky/color/canvas), ambient lighting, glow, and volumetric fog. Use create_world_environment to add it to a scene.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path for new .tres file relative to project (e.g., \"environments/outdoor.tres\")"
            },
            "backgroundMode": {
                "type": "string",
                "enum": ["sky", "color", "canvas"],
                "description": "Background mode: sky (default), color (solid color), canvas (2D layer)"
            },
            "backgroundColor": {
                "type": "object",
                "description": "Background color when mode is \"color\" (default: {r:0.3, g:0.3, b:0.3})",
                "properties": {
                    "r": { "type": "number" },
                    "g": { "type": "number" },
                    "b": { "type": "number" }
                }
            },
            "ambientLightColor": {
                "type": "object",
                "description": "Ambient light color (default: {r:1.0, g:1.0, b:1.0})",
                "properties": {
                    "r": { "type": "number" },
                    "g": { "type": "number" },
                    "b": { "type": "number" }
                }
            },
            "ambientLightEnergy": {
                "type": "number",
                "description": "Ambient light intensity (default: 1.0)"
            },
            "glowEnabled": {
                "type": "boolean",
                "description": "Enable glow post-processing (default: false)"
            },
            "fogEnabled": {
                "type": "boolean",
                "description": "Enable volumetric fog (default: false)"
            }
        },
        "required": [
            "projectPath",
            "resourcePath"
        ]
    },
    category: FunctionCategory.Rendering,
    executionPath: "headless",
  },
  {
    name: "create_world_environment",
    description: "Creates a WorldEnvironment node in a scene to apply 3D rendering settings. Links to an existing Environment resource or creates a default one. Prerequisite: scene must exist.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project (e.g., \"scenes/Level1.tscn\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the WorldEnvironment node (default: \"WorldEnvironment\")"
            },
            "environmentPath": {
                "type": "string",
                "description": "Path to existing Environment resource. If empty, creates a default Environment."
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Rendering,
    executionPath: "headless",
  },
  {
    name: "create_light",
    description: "Creates a light node in a scene. Supports 3D types (DirectionalLight3D, OmniLight3D, SpotLight3D) and 2D types (DirectionalLight2D, PointLight2D). Configures color, energy, and shadows.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project (e.g., \"scenes/Level1.tscn\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the light node (default: \"Light\")"
            },
            "lightType": {
                "type": "string",
                "enum": ["DirectionalLight3D", "OmniLight3D", "SpotLight3D", "DirectionalLight2D", "PointLight2D"],
                "description": "Light node type (default: \"DirectionalLight3D\")"
            },
            "color": {
                "type": "object",
                "description": "Light color (default: {r:1.0, g:1.0, b:1.0})",
                "properties": {
                    "r": { "type": "number" },
                    "g": { "type": "number" },
                    "b": { "type": "number" }
                }
            },
            "energy": {
                "type": "number",
                "description": "Light intensity/energy (default: 1.0)"
            },
            "shadowEnabled": {
                "type": "boolean",
                "description": "Enable shadow casting (default: false)"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Rendering,
    executionPath: "headless",
  },
  {
    name: "create_camera",
    description: "Creates a Camera node in a scene. Supports Camera2D and Camera3D. For 3D: configures FOV and current flag. For 2D: configures zoom level.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project (e.g., \"scenes/Level1.tscn\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the camera node (default: \"Camera\")"
            },
            "is3D": {
                "type": "boolean",
                "description": "If true, creates Camera3D. If false (default), creates Camera2D."
            },
            "current": {
                "type": "boolean",
                "description": "For Camera3D: set as current camera (default: false)"
            },
            "fov": {
                "type": "number",
                "description": "For Camera3D: field of view in degrees (default: 75.0)"
            },
            "zoom": {
                "type": "object",
                "description": "For Camera2D: zoom level (default: {x:1, y:1})",
                "properties": {
                    "x": { "type": "number" },
                    "y": { "type": "number" }
                }
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Rendering,
    executionPath: "headless",
  }
];
