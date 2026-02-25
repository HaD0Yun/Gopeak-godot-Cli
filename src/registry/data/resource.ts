import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const resourceTools: FunctionDefinition[] = [
  {
    name: "apply_theme_shader",
    description: "Generate and apply theme-appropriate shader to a material in a scene",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "scenePath": {
                "type": "string",
                "description": "Path to the scene file (relative to project)"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to MeshInstance3D or Sprite node"
            },
            "theme": {
                "type": "string",
                "enum": [
                    "medieval",
                    "cyberpunk",
                    "nature",
                    "scifi",
                    "horror",
                    "cartoon"
                ],
                "description": "Visual theme to apply"
            },
            "effect": {
                "type": "string",
                "enum": [
                    "none",
                    "glow",
                    "hologram",
                    "wind_sway",
                    "torch_fire",
                    "dissolve",
                    "outline"
                ],
                "description": "Special effect to add (default: none)"
            },
            "shaderParams": {
                "type": "string",
                "description": "Optional JSON string with custom shader parameters"
            }
        },
        "required": [
            "projectPath",
            "scenePath",
            "nodePath",
            "theme"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "create_audio_bus",
    description: "Creates a new audio bus for mixing. Use to set up separate volume controls for music, SFX, voice, etc.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "busName": {
                "type": "string",
                "description": "Name for the audio bus (e.g., \"Music\", \"SFX\", \"Voice\")"
            },
            "parentBusIndex": {
                "type": "number",
                "description": "Parent bus index. Default: 0 (Master)"
            }
        },
        "required": [
            "projectPath",
            "busName"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "create_material",
    description: "Creates a material resource for 3D/2D rendering. Types: StandardMaterial3D (PBR), ShaderMaterial (custom), CanvasItemMaterial (2D), ParticleProcessMaterial (particles).",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "materialPath": {
                "type": "string",
                "description": "Path for new material file relative to project (e.g., \"materials/player.tres\")"
            },
            "materialType": {
                "type": "string",
                "enum": [
                    "StandardMaterial3D",
                    "ShaderMaterial",
                    "CanvasItemMaterial",
                    "ParticleProcessMaterial"
                ],
                "description": "Material type: StandardMaterial3D (3D PBR), ShaderMaterial (custom shader), CanvasItemMaterial (2D), ParticleProcessMaterial (particles)"
            },
            "properties": {
                "type": "string",
                "description": "Optional: JSON object of properties (e.g., {\"albedo_color\": [1, 0, 0, 1], \"metallic\": 0.8})"
            },
            "shader": {
                "type": "string",
                "description": "Optional for ShaderMaterial: path to .gdshader file (e.g., \"shaders/outline.gdshader\")"
            }
        },
        "required": [
            "projectPath",
            "materialPath",
            "materialType"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "create_resource",
    description: "Creates ANY resource type as a .tres file. This is the universal resource creation tool — replaces all specialized create_* resource tools (PhysicsMaterial, Environment, Theme, etc.). Supports ALL ClassDB resource types. Set any property via the properties parameter with type conversion support. Use query_classes with category \"resource\" to discover available resource types. Use query_class_info to discover available properties.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path for new .tres file relative to project (e.g., \"resources/items/sword.tres\")"
            },
            "resourceType": {
                "type": "string",
                "description": "Resource class name (e.g., \"Resource\", \"CurveTexture\", \"GradientTexture2D\")"
            },
            "properties": {
                "type": "string",
                "description": "Optional: JSON object of properties to set (e.g., {\"value\": 100})"
            },
            "script": {
                "type": "string",
                "description": "Optional: path to custom Resource script (e.g., \"scripts/resources/item_data.gd\")"
            }
        },
        "required": [
            "projectPath",
            "resourcePath",
            "resourceType"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "create_script",
    description: "Creates a new GDScript (.gd) file with optional templates. Use to generate scripts for game logic. Templates: \"singleton\" (autoload), \"state_machine\" (FSM), \"component\" (modular), \"resource\" (custom Resource).",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scriptPath": {
                "type": "string",
                "description": "Path for new script relative to project (e.g., \"scripts/player.gd\", \"autoload/game_manager.gd\")"
            },
            "className": {
                "type": "string",
                "description": "Optional: class_name for global access (e.g., \"Player\", \"GameManager\")"
            },
            "extends": {
                "type": "string",
                "description": "Base class to extend (e.g., \"Node\", \"CharacterBody2D\", \"Resource\"). Default: \"Node\""
            },
            "content": {
                "type": "string",
                "description": "Optional: initial script content to add after class declaration"
            },
            "template": {
                "type": "string",
                "description": "Optional: template name - \"singleton\", \"state_machine\", \"component\", \"resource\""
            }
        },
        "required": [
            "projectPath",
            "scriptPath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "create_shader",
    description: "Creates a shader file (.gdshader) with optional templates. Types: canvas_item (2D), spatial (3D), particles, sky, fog. Templates: basic, color_shift, outline.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "shaderPath": {
                "type": "string",
                "description": "Path for new .gdshader file relative to project (e.g., \"shaders/outline.gdshader\")"
            },
            "shaderType": {
                "type": "string",
                "enum": [
                    "canvas_item",
                    "spatial",
                    "particles",
                    "sky",
                    "fog"
                ],
                "description": "Shader type: canvas_item (2D/UI), spatial (3D), particles, sky, fog"
            },
            "code": {
                "type": "string",
                "description": "Optional: custom shader code. If omitted, uses template or generates basic shader."
            },
            "template": {
                "type": "string",
                "description": "Optional: predefined template - \"basic\", \"color_shift\", \"outline\""
            }
        },
        "required": [
            "projectPath",
            "shaderPath",
            "shaderType"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "get_audio_buses",
    description: "Lists all audio buses and their configuration. Use to check current audio setup.",
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
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "get_import_options",
    description: "Returns current import settings for a resource. Use to check compression, mipmaps, filter settings before modifying.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path to resource file (e.g., \"textures/player.png\", \"audio/music.ogg\")"
            }
        },
        "required": [
            "projectPath",
            "resourcePath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "get_import_status",
    description: "Returns import status for project resources. Use to find outdated or failed imports. Shows which resources need reimporting.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Optional: specific resource path (e.g., \"textures/player.png\"). If omitted, returns all."
            },
            "includeUpToDate": {
                "type": "boolean",
                "description": "If true, includes already-imported resources. Default: false (only pending)"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "get_script_info",
    description: "Analyzes a GDScript and returns its structure: functions, variables, signals, class_name, extends. Use before modify_script to understand existing code.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to .gd file relative to project (e.g., \"scripts/player.gd\")"
            },
            "includeInherited": {
                "type": "boolean",
                "description": "If true, includes members from parent classes. Default: false (only script-defined members)."
            }
        },
        "required": [
            "projectPath",
            "scriptPath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "get_uid",
    description: "Get the UID for a specific file in a Godot project (for Godot 4.4+)",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "filePath": {
                "type": "string",
                "description": "Path to the file (relative to project) for which to get the UID"
            }
        },
        "required": [
            "projectPath",
            "filePath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "modify_resource",
    description: "Modify properties of an existing resource file (.tres/.res). Use to update materials, environments, themes, or any saved resource without recreating it.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path to existing resource file relative to project (e.g., \"materials/player.tres\")"
            },
            "properties": {
                "type": "string",
                "description": "JSON object of properties to set (e.g., {\"albedo_color\": {\"_type\": \"Color\", \"r\": 1, \"g\": 0, \"b\": 0, \"a\": 1}})"
            }
        },
        "required": [
            "projectPath",
            "resourcePath",
            "properties"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "modify_script",
    description: "Adds functions, variables, or signals to an existing GDScript. Use to extend scripts without manual editing. Supports @export, @onready annotations and type hints.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scriptPath": {
                "type": "string",
                "description": "Path to existing .gd file relative to project (e.g., \"scripts/player.gd\")"
            },
            "modifications": {
                "type": "array",
                "description": "Array of modifications to apply",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "description": "Modification type: \"add_function\", \"add_variable\", or \"add_signal\""
                        },
                        "name": {
                            "type": "string",
                            "description": "Name of the function, variable, or signal"
                        },
                        "params": {
                            "type": "string",
                            "description": "For functions/signals: parameter string (e.g., \"delta: float, input: Vector2\")"
                        },
                        "returnType": {
                            "type": "string",
                            "description": "For functions: return type (e.g., \"void\", \"bool\", \"Vector2\")"
                        },
                        "body": {
                            "type": "string",
                            "description": "For functions: function body code"
                        },
                        "varType": {
                            "type": "string",
                            "description": "For variables: type annotation"
                        },
                        "defaultValue": {
                            "type": "string",
                            "description": "For variables: default value"
                        },
                        "isExport": {
                            "type": "boolean",
                            "description": "For variables: whether to add @export annotation"
                        },
                        "exportHint": {
                            "type": "string",
                            "description": "For variables: export hint (e.g., \"range(0, 100)\")"
                        },
                        "isOnready": {
                            "type": "boolean",
                            "description": "For variables: whether to add @onready annotation"
                        },
                        "position": {
                            "type": "string",
                            "description": "For functions: where to insert (\"end\", \"after_ready\", \"after_init\")"
                        }
                    },
                    "required": [
                        "type",
                        "name"
                    ]
                }
            }
        },
        "required": [
            "projectPath",
            "scriptPath",
            "modifications"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "reimport_resource",
    description: "Forces reimport of resources. Use after modifying source files or to fix import issues. Can reimport single file or all modified.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Optional: specific resource to reimport. If omitted, reimports all modified."
            },
            "force": {
                "type": "boolean",
                "description": "If true, reimports even if up-to-date. Default: false"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "set_audio_bus_effect",
    description: "Adds or configures an audio effect on a bus. Use for reverb, delay, EQ, compression, etc.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "busIndex": {
                "type": "number",
                "description": "Bus index (0 = Master)"
            },
            "effectIndex": {
                "type": "number",
                "description": "Effect slot index (0-7)"
            },
            "effectType": {
                "type": "string",
                "description": "Effect type (e.g., \"Reverb\", \"Delay\", \"Chorus\", \"Compressor\")"
            },
            "enabled": {
                "type": "boolean",
                "description": "Whether effect is active"
            }
        },
        "required": [
            "projectPath",
            "busIndex",
            "effectIndex",
            "effectType"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "set_audio_bus_volume",
    description: "Sets volume for an audio bus in decibels. Use to balance audio levels.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "busIndex": {
                "type": "number",
                "description": "Bus index (0 = Master)"
            },
            "volumeDb": {
                "type": "number",
                "description": "Volume in decibels (0 = unity, -80 = silent, +6 = boost)"
            }
        },
        "required": [
            "projectPath",
            "busIndex",
            "volumeDb"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "set_import_options",
    description: "Modifies import settings for a resource. Use to change compression, mipmaps, filter mode. Triggers reimport by default.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path to resource file (e.g., \"textures/player.png\")"
            },
            "options": {
                "type": "string",
                "description": "JSON string of import options (e.g., {\"compress/mode\": 1, \"mipmaps/generate\": true})"
            },
            "reimport": {
                "type": "boolean",
                "description": "If true (default), reimports after setting. Set false for batch changes."
            }
        },
        "required": [
            "projectPath",
            "resourcePath",
            "options"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "set_theme_color",
    description: "Set a color in a Theme resource",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "themePath": {
                "type": "string",
                "description": "Path to the theme resource"
            },
            "controlType": {
                "type": "string",
                "description": "Control type (Button, Label, etc.)"
            },
            "colorName": {
                "type": "string",
                "description": "Color name (font_color, etc.)"
            },
            "color": {
                "type": "object",
                "properties": {
                    "r": {
                        "type": "number"
                    },
                    "g": {
                        "type": "number"
                    },
                    "b": {
                        "type": "number"
                    },
                    "a": {
                        "type": "number"
                    }
                },
                "description": "Color value"
            }
        },
        "required": [
            "projectPath",
            "themePath",
            "controlType",
            "colorName",
            "color"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "set_theme_font_size",
    description: "Set a font size in a Theme resource",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "themePath": {
                "type": "string",
                "description": "Path to the theme resource"
            },
            "controlType": {
                "type": "string",
                "description": "Control type (Button, Label, etc.)"
            },
            "fontSizeName": {
                "type": "string",
                "description": "Font size name"
            },
            "size": {
                "type": "number",
                "description": "Font size in pixels"
            }
        },
        "required": [
            "projectPath",
            "themePath",
            "controlType",
            "fontSizeName",
            "size"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  },
  {
    name: "update_project_uids",
    description: "Update UID references in a Godot project by resaving resources (for Godot 4.4+)",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Resource,
    executionPath: "headless",
  }
];
