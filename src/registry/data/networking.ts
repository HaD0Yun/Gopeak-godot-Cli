import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const networkingTools: FunctionDefinition[] = [
  {
    name: "create_http_request",
    description: "Creates an HTTPRequest node in a scene. Use for making HTTP calls to REST APIs, downloading files, or communicating with web services from within Godot.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file relative to project (e.g., \"scenes/GameManager.tscn\")"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the HTTPRequest node (default: \"HTTPRequest\")"
            },
            "timeout": {
                "type": "number",
                "description": "Request timeout in seconds (default: 10.0)"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Networking,
    executionPath: "headless",
  },
  {
    name: "create_multiplayer_spawner",
    description: "Creates a MultiplayerSpawner node for networked object spawning. Use in multiplayer games to synchronize spawning of players, projectiles, and other networked objects.",
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
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the MultiplayerSpawner node (default: \"MultiplayerSpawner\")"
            },
            "spawnPath": {
                "type": "string",
                "description": "NodePath to the node where spawned objects are added as children"
            },
            "spawnableScenes": {
                "type": "array",
                "description": "Array of scene paths that can be spawned by this spawner",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Networking,
    executionPath: "headless",
  },
  {
    name: "create_multiplayer_synchronizer",
    description: "Creates a MultiplayerSynchronizer node for networked property replication. Use in multiplayer games to keep properties (position, health, state) in sync across peers.",
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
            "parentPath": {
                "type": "string",
                "description": "Parent node path (default: \"root\")"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for the MultiplayerSynchronizer node (default: \"MultiplayerSynchronizer\")"
            },
            "rootPath": {
                "type": "string",
                "description": "Root path for property synchronization. Properties under this path can be replicated."
            },
            "replicationInterval": {
                "type": "number",
                "description": "How often properties are synchronized in seconds (default: 0.0 = every frame)"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Networking,
    executionPath: "headless",
  }
];
