import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const nodeTools: FunctionDefinition[] = [
  {
    name: "add_node",
    description: "Adds ANY node type to an existing scene. This is the universal node creation tool — replaces all specialized create_* node tools. Supports ALL ClassDB node types (Camera3D, DirectionalLight3D, AudioStreamPlayer, HTTPRequest, RayCast3D, etc.). Set any property via the properties parameter with type conversion support (Vector2, Vector3, Color, etc.). Use query_classes to discover available node types. Use query_class_info to discover available properties for a type.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "parentNodePath": {
                "type": "string",
                "description": "Node path within scene (e.g., \".\" for root, \"Player\" for direct child, \"Player/Sprite2D\" for nested)"
            },
            "nodeType": {
                "type": "string",
                "description": "Godot node class name (e.g., \"Sprite2D\", \"CollisionShape2D\", \"CharacterBody2D\"). Must be valid Godot 4 class."
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the new node (will be unique identifier in scene tree)"
            },
            "properties": {
                "type": "string",
                "description": "Optional properties to set on the node (as JSON string)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodeType",
            "nodeName"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "delete_node",
    description: "Removes a node and all its children from a scene. Use to clean up unused nodes. Cannot delete root node. Scene is saved automatically unless saveScene=false.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to node to delete (e.g., \"Player/OldSprite\", \"Enemies/Enemy1\")"
            },
            "saveScene": {
                "type": "boolean",
                "description": "If true (default), saves scene after deletion. Set false for batch operations."
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "duplicate_node",
    description: "Creates a copy of a node with all its properties and children. Use to replicate enemies, UI elements, or any repeated structures. Scene is saved automatically unless saveScene=false.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Level.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to node to duplicate (e.g., \"Enemies/Enemy\", \"UI/Button\")"
            },
            "newName": {
                "type": "string",
                "description": "Name for the new duplicated node (e.g., \"Enemy2\", \"ButtonCopy\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Optional: Different parent path. If omitted, uses same parent as original."
            },
            "saveScene": {
                "type": "boolean",
                "description": "If true (default), saves scene after duplication. Set false for batch operations."
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "newName"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "get_node_properties",
    description: "Returns all properties of a specific node in a scene. Use to inspect current values before modifying. Returns property names, values, and types.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to node within scene (e.g., \".\", \"Player\", \"Player/Sprite2D\")"
            },
            "includeDefaults": {
                "type": "boolean",
                "description": "If true, includes properties with default values. If false (default), only modified properties."
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "load_sprite",
    description: "Assigns a texture to a Sprite2D node in a scene. Use to set character sprites, backgrounds, or UI images. The texture file must exist in the project.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to Sprite2D node in scene (e.g., \".\", \"Player/Sprite2D\")"
            },
            "texturePath": {
                "type": "string",
                "description": "Path to texture file relative to project (e.g., \"assets/player.png\", \"sprites/enemy.svg\")"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "texturePath"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "reparent_node",
    description: "Moves a node to a different parent in the scene tree, preserving all properties and children. Use for reorganizing scene hierarchy. Scene is saved automatically unless saveScene=false.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Level.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to node to move (e.g., \"OldParent/Child\", \"UI/Button\")"
            },
            "newParentPath": {
                "type": "string",
                "description": "Path to new parent node (e.g., \"NewParent\", \"UI/Panel\")"
            },
            "saveScene": {
                "type": "boolean",
                "description": "If true (default), saves scene after reparenting. Set false for batch operations."
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "newParentPath"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  },
  {
    name: "set_node_properties",
    description: "Sets multiple properties on a node in a scene. Prerequisite: scene and node must exist (use create_scene and add_node first). Use to modify position, scale, rotation, or any node-specific properties. Scene is saved automatically unless saveScene=false.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file relative to project (e.g., \"scenes/Player.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to node within scene (e.g., \".\", \"Player\", \"Player/Sprite2D\")"
            },
            "properties": {
                "type": "string",
                "description": "JSON object of properties to set (e.g., {\"position\": {\"x\": 100, \"y\": 200}, \"scale\": {\"x\": 2, \"y\": 2}})"
            },
            "saveScene": {
                "type": "boolean",
                "description": "If true (default), saves scene after modification. Set false for batch operations."
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "properties"
        ]
    },
    category: FunctionCategory.Node,
    executionPath: "headless",
  }
];
