import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const physicsTools: FunctionDefinition[] = [
  {
    name: "configure_physics_layer",
    description: "Configures a physics layer name in ProjectSettings. Use to label collision layers (e.g., \"Player\", \"Enemy\", \"Wall\") for better organization. Modifies project.godot directly.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "layerType": {
                "type": "string",
                "enum": ["2d", "3d"],
                "description": "Physics layer type: \"2d\" (default) or \"3d\""
            },
            "layerIndex": {
                "type": "number",
                "description": "Layer index (1-32). Default: 1"
            },
            "layerName": {
                "type": "string",
                "description": "Human-readable name for the layer (e.g., \"Player\", \"Enemy\", \"Terrain\")"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Physics,
    executionPath: "headless",
  },
  {
    name: "create_physics_material",
    description: "Creates a PhysicsMaterial resource (.tres) with friction, bounce, roughness, and absorbent properties. Use to define how surfaces interact during collisions.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "materialPath": {
                "type": "string",
                "description": "Path for new .tres file relative to project (e.g., \"physics/bouncy.tres\")"
            },
            "friction": {
                "type": "number",
                "description": "Friction coefficient (default: 1.0). Higher = more friction."
            },
            "bounce": {
                "type": "number",
                "description": "Bounciness/restitution (default: 0.0). 1.0 = perfectly bouncy."
            },
            "rough": {
                "type": "boolean",
                "description": "If true, uses rough friction mode (default: false)"
            },
            "absorbent": {
                "type": "boolean",
                "description": "If true, uses absorbent bounce mode (default: false)"
            }
        },
        "required": [
            "projectPath",
            "materialPath"
        ]
    },
    category: FunctionCategory.Physics,
    executionPath: "headless",
  },
  {
    name: "create_raycast",
    description: "Creates a RayCast2D or RayCast3D node in a scene. Use for line-of-sight checks, ground detection, weapon aiming, or obstacle sensing. Configures target position and collision mask.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the RayCast node (default: \"RayCast\")"
            },
            "is3D": {
                "type": "boolean",
                "description": "If true, creates RayCast3D. If false (default), creates RayCast2D."
            },
            "targetPosition": {
                "type": "object",
                "description": "Raycast target position relative to node (default: {x:0, y:100, z:0})",
                "properties": {
                    "x": { "type": "number" },
                    "y": { "type": "number" },
                    "z": { "type": "number" }
                }
            },
            "collisionMask": {
                "type": "number",
                "description": "Collision mask bitmask (default: 1). Determines which layers the ray interacts with."
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Physics,
    executionPath: "headless",
  },
  {
    name: "set_collision_layer_mask",
    description: "Sets collision layer and mask on a physics node (CollisionObject2D/3D). Use to control which layers a node exists on and which it detects.",
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
                "description": "Path to the physics node in the scene"
            },
            "collisionLayer": {
                "type": "number",
                "description": "Collision layer bitmask — which layers this node IS ON (default: 1)"
            },
            "collisionMask": {
                "type": "number",
                "description": "Collision mask bitmask — which layers this node DETECTS (default: 1)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath"
        ]
    },
    category: FunctionCategory.Physics,
    executionPath: "headless",
  },
  {
    name: "configure_navigation_layers",
    description: "Configures a navigation layer name in ProjectSettings. Use to label navigation layers for organizing pathfinding regions. Modifies project.godot directly.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "is3D": {
                "type": "boolean",
                "description": "If true, configures 3D navigation layer. If false (default), configures 2D."
            },
            "layerIndex": {
                "type": "number",
                "description": "Layer index (1-32). Default: 1"
            },
            "layerName": {
                "type": "string",
                "description": "Human-readable name for the navigation layer"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Physics,
    executionPath: "headless",
  }
];
