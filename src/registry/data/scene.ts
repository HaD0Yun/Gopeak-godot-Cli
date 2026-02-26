import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const sceneTools: FunctionDefinition[] = [
  {
    name: "add_animation_state",
    description: "Add a state to an AnimationTree state machine",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to the scene file"
            },
            "animTreePath": {
                "type": "string",
                "description": "Path to AnimationTree node"
            },
            "stateName": {
                "type": "string",
                "description": "Name for the state"
            },
            "animationName": {
                "type": "string",
                "description": "Animation to play in this state"
            },
            "stateMachinePath": {
                "type": "string",
                "description": "Path within tree to state machine (default: root)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "animTreePath",
            "stateName",
            "animationName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "add_animation_track",
    description: "Adds a property or method track to an animation. Prerequisite: animation must exist (use create_animation first). Use to animate position, rotation, color, or call methods at specific times. Keyframes define values over time.",
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
            "playerNodePath": {
                "type": "string",
                "description": "Path to AnimationPlayer node in scene (e.g., \".\", \"Player/AnimationPlayer\")"
            },
            "animationName": {
                "type": "string",
                "description": "Name of existing animation to add track to (e.g., \"walk\", \"idle\")"
            },
            "track": {
                "type": "object",
                "description": "Track configuration",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "property",
                            "method"
                        ],
                        "description": "Type of track to add"
                    },
                    "nodePath": {
                        "type": "string",
                        "description": "Path to the target node relative to AnimationPlayer's root (e.g., \"Sprite2D\")"
                    },
                    "property": {
                        "type": "string",
                        "description": "Property name to animate (for property tracks, e.g., \"position\", \"modulate\")"
                    },
                    "method": {
                        "type": "string",
                        "description": "Method name to call (for method tracks)"
                    },
                    "keyframes": {
                        "type": "array",
                        "description": "Array of keyframes",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time": {
                                    "type": "number",
                                    "description": "Time position in seconds"
                                },
                                "value": {
                                    "type": "string",
                                    "description": "Value at this keyframe (for property tracks)"
                                },
                                "args": {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    },
                                    "description": "Arguments to pass to the method (for method tracks, as JSON strings)"
                                }
                            },
                            "required": [
                                "time"
                            ]
                        }
                    }
                },
                "required": [
                    "type",
                    "nodePath",
                    "keyframes"
                ]
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "playerNodePath",
            "animationName",
            "track"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "connect_animation_states",
    description: "Connect two states with a transition",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to the scene file"
            },
            "animTreePath": {
                "type": "string",
                "description": "Path to AnimationTree node"
            },
            "fromState": {
                "type": "string",
                "description": "Source state name"
            },
            "toState": {
                "type": "string",
                "description": "Target state name"
            },
            "transitionType": {
                "type": "string",
                "enum": [
                    "immediate",
                    "sync",
                    "at_end"
                ],
                "description": "Transition type"
            },
            "advanceCondition": {
                "type": "string",
                "description": "Condition parameter name for auto-advance"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "animTreePath",
            "fromState",
            "toState"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "connect_signal",
    description: "Creates a signal connection between nodes in a scene. Prerequisite: source and target nodes must exist. Use to wire up button clicks, collision events, custom signals. Saved to scene file.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file (e.g., \"scenes/ui/menu.tscn\")"
            },
            "sourceNodePath": {
                "type": "string",
                "description": "Emitting node path (e.g., \"StartButton\", \"Player/Area2D\")"
            },
            "signalName": {
                "type": "string",
                "description": "Signal name (e.g., \"pressed\", \"body_entered\", \"health_changed\")"
            },
            "targetNodePath": {
                "type": "string",
                "description": "Receiving node path (e.g., \".\", \"Player\", \"../GameManager\")"
            },
            "methodName": {
                "type": "string",
                "description": "Method to call on target (e.g., \"_on_start_pressed\", \"take_damage\")"
            },
            "flags": {
                "type": "number",
                "description": "Optional: connection flags (0=default, 1=deferred, 2=persist, 4=one_shot)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "sourceNodePath",
            "signalName",
            "targetNodePath",
            "methodName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_animation",
    description: "Creates a new animation in an AnimationPlayer. Prerequisite: AnimationPlayer node must exist in scene (use add_node first). Use to set up character animations, UI transitions, or cutscenes. Supports loop modes: none, linear, pingpong.",
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
            "playerNodePath": {
                "type": "string",
                "description": "Path to AnimationPlayer node in scene (e.g., \".\", \"Player/AnimationPlayer\")"
            },
            "animationName": {
                "type": "string",
                "description": "Name for new animation (e.g., \"walk\", \"idle\", \"attack\")"
            },
            "length": {
                "type": "number",
                "description": "Duration of the animation in seconds (default: 1.0)"
            },
            "loopMode": {
                "type": "string",
                "enum": [
                    "none",
                    "linear",
                    "pingpong"
                ],
                "description": "Loop mode for the animation (default: \"none\")"
            },
            "step": {
                "type": "number",
                "description": "Keyframe snap step in seconds (default: 0.1)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "playerNodePath",
            "animationName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_animation_tree",
    description: "Create an AnimationTree node linked to an AnimationPlayer",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to the scene file"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path"
            },
            "nodeName": {
                "type": "string",
                "description": "Name for AnimationTree"
            },
            "animPlayerPath": {
                "type": "string",
                "description": "Path to AnimationPlayer node (relative to parent)"
            },
            "rootType": {
                "type": "string",
                "enum": [
                    "StateMachine",
                    "BlendTree",
                    "BlendSpace1D",
                    "BlendSpace2D"
                ],
                "description": "Root node type"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "parentPath",
            "nodeName",
            "animPlayerPath"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_navigation_agent",
    description: "Creates a NavigationAgent for AI pathfinding. Use for enemies, NPCs that need to navigate around obstacles.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path (usually the character)"
            },
            "nodeName": {
                "type": "string",
                "description": "Node name (e.g., \"NavAgent\")"
            },
            "is3D": {
                "type": "boolean",
                "description": "If true, creates NavigationAgent3D. Default: false"
            },
            "pathDesiredDistance": {
                "type": "number",
                "description": "Distance to consider waypoint reached"
            },
            "targetDesiredDistance": {
                "type": "number",
                "description": "Distance to consider target reached"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "parentPath",
            "nodeName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_navigation_region",
    description: "Creates a NavigationRegion for pathfinding. Use to define walkable areas for AI navigation.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene file"
            },
            "parentPath": {
                "type": "string",
                "description": "Parent node path"
            },
            "nodeName": {
                "type": "string",
                "description": "Node name (e.g., \"WalkableArea\")"
            },
            "is3D": {
                "type": "boolean",
                "description": "If true, creates NavigationRegion3D. Default: false"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "parentPath",
            "nodeName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_scene",
    description: "Creates a new Godot scene file (.tscn) with a specified root node type. Use to start building new game levels, UI screens, or reusable components. The scene is saved automatically after creation.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path for new scene file relative to project (e.g., \"scenes/Player.tscn\", \"levels/Level1.tscn\")"
            },
            "rootNodeType": {
                "type": "string",
                "description": "Godot node class for root (e.g., \"Node2D\" for 2D games, \"Node3D\" for 3D, \"Control\" for UI). Default: \"Node\""
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "create_tileset",
    description: "Creates a TileSet resource from texture atlases. Use for 2D tilemaps in platformers, RPGs, etc. Supports multiple atlas sources.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "tilesetPath": {
                "type": "string",
                "description": "Output path for TileSet (e.g., \"resources/world_tiles.tres\")"
            },
            "sources": {
                "type": "array",
                "description": "Array of atlas sources, each with texture path and tileSize {x, y}",
                "items": {
                    "type": "object",
                    "properties": {
                        "texture": {
                            "type": "string",
                            "description": "Texture path relative to project (e.g., \"sprites/tileset.png\")"
                        },
                        "tileSize": {
                            "type": "object",
                            "description": "Tile dimensions in pixels",
                            "properties": {
                                "x": {
                                    "type": "number",
                                    "description": "Tile width (e.g., 16, 32)"
                                },
                                "y": {
                                    "type": "number",
                                    "description": "Tile height (e.g., 16, 32)"
                                }
                            },
                            "required": [
                                "x",
                                "y"
                            ]
                        },
                        "separation": {
                            "type": "object",
                            "description": "Optional: gap between tiles in source texture",
                            "properties": {
                                "x": {
                                    "type": "number",
                                    "description": "Horizontal gap"
                                },
                                "y": {
                                    "type": "number",
                                    "description": "Vertical gap"
                                }
                            }
                        },
                        "offset": {
                            "type": "object",
                            "description": "Optional: offset from texture origin",
                            "properties": {
                                "x": {
                                    "type": "number",
                                    "description": "Horizontal offset"
                                },
                                "y": {
                                    "type": "number",
                                    "description": "Vertical offset"
                                }
                            }
                        }
                    },
                    "required": [
                        "texture",
                        "tileSize"
                    ]
                }
            }
        },
        "required": [
            "projectPath",
            "tilesetPath",
            "sources"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "disconnect_signal",
    description: "Removes a signal connection from a scene. Use to clean up unused connections or rewire logic.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file (e.g., \"scenes/ui/menu.tscn\")"
            },
            "sourceNodePath": {
                "type": "string",
                "description": "Emitting node path (e.g., \"StartButton\")"
            },
            "signalName": {
                "type": "string",
                "description": "Signal name (e.g., \"pressed\")"
            },
            "targetNodePath": {
                "type": "string",
                "description": "Receiving node path (e.g., \".\")"
            },
            "methodName": {
                "type": "string",
                "description": "Connected method name (e.g., \"_on_start_pressed\")"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "sourceNodePath",
            "signalName",
            "targetNodePath",
            "methodName"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "list_connections",
    description: "Lists all signal connections in a scene. Use to understand event flow or debug connection issues.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to .tscn file (e.g., \"scenes/player.tscn\")"
            },
            "nodePath": {
                "type": "string",
                "description": "Optional: filter to connections involving this node. If omitted, shows all."
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "list_scene_nodes",
    description: "Returns complete scene tree structure with all nodes, types, and hierarchy. Use to understand scene organization before modifying. Returns nested tree with node paths.",
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
            "depth": {
                "type": "number",
                "description": "Maximum depth to traverse. -1 = all (default), 0 = root only, 1 = root + children"
            },
            "includeProperties": {
                "type": "boolean",
                "description": "If true, includes all node properties. If false (default), only names and types."
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "save_scene",
    description: "Saves changes to a scene file or creates a variant at a new path. Most scene modification tools save automatically, but use this for explicit saves or creating variants.",
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
            "newPath": {
                "type": "string",
                "description": "Optional: New path to save as variant (e.g., \"scenes/PlayerBlue.tscn\")"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "set_tilemap_cells",
    description: "Places tiles in a TileMap node. Use to programmatically generate levels or modify existing tilemaps.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to scene containing TileMap (e.g., \"scenes/level1.tscn\")"
            },
            "tilemapNodePath": {
                "type": "string",
                "description": "Path to TileMap node (e.g., \"World/TileMap\")"
            },
            "layer": {
                "type": "number",
                "description": "TileMap layer index. Default: 0"
            },
            "cells": {
                "type": "array",
                "description": "Array of cells with coords {x,y}, sourceId, atlasCoords {x,y}",
                "items": {
                    "type": "object",
                    "properties": {
                        "coords": {
                            "type": "object",
                            "description": "Grid position in tilemap",
                            "properties": {
                                "x": {
                                    "type": "number",
                                    "description": "Grid X"
                                },
                                "y": {
                                    "type": "number",
                                    "description": "Grid Y"
                                }
                            },
                            "required": [
                                "x",
                                "y"
                            ]
                        },
                        "sourceId": {
                            "type": "number",
                            "description": "TileSet source ID (0-indexed)"
                        },
                        "atlasCoords": {
                            "type": "object",
                            "description": "Tile position in atlas",
                            "properties": {
                                "x": {
                                    "type": "number",
                                    "description": "Atlas X"
                                },
                                "y": {
                                    "type": "number",
                                    "description": "Atlas Y"
                                }
                            },
                            "required": [
                                "x",
                                "y"
                            ]
                        },
                        "alternativeTile": {
                            "type": "number",
                            "description": "Optional: alternative tile variant. Default: 0"
                        }
                    },
                    "required": [
                        "coords",
                        "sourceId",
                        "atlasCoords"
                    ]
                }
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "tilemapNodePath",
            "cells"
        ]
    },
    category: FunctionCategory.Scene,
    executionPath: "headless",
  },
  {
    name: "set_animation_tree_parameter",
    description: "Sets a parameter on an AnimationTree node. Use to control blend amounts, transition conditions, or any AnimationTree parameter at edit time. The parameter is saved with the scene.",
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
            "animTreePath": {
                "type": "string",
                "description": "Path to AnimationTree node in the scene"
            },
            "parameterPath": {
                "type": "string",
                "description": "Parameter path within the AnimationTree (e.g., \"parameters/blend_amount\", \"parameters/conditions/is_moving\")"
            },
            "value": {
                "description": "Value to set for the parameter (number, boolean, or string depending on parameter type)"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "animTreePath",
            "parameterPath"
        ]
    },
    category: FunctionCategory.Animation,
    executionPath: "headless",
  }
];
