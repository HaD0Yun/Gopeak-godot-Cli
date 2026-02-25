import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const projectTools: FunctionDefinition[] = [
  {
    name: "add_autoload",
    description: "Registers a script/scene as an autoload singleton. Use for global managers (GameManager, AudioManager, etc.). Loads automatically on game start.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "name": {
                "type": "string",
                "description": "Singleton name for global access (e.g., \"GameManager\", \"EventBus\")"
            },
            "path": {
                "type": "string",
                "description": "Path to .gd or .tscn file (e.g., \"autoload/game_manager.gd\")"
            },
            "enabled": {
                "type": "boolean",
                "description": "If true (default), autoload is active. Set false to temporarily disable."
            }
        },
        "required": [
            "projectPath",
            "name",
            "path"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "add_input_action",
    description: "Registers a new input action in project.godot InputMap. Use to set up keyboard, mouse, or gamepad controls for player actions like jump, move, attack.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "actionName": {
                "type": "string",
                "description": "Action name used in code (e.g., \"jump\", \"move_left\", \"attack\")"
            },
            "events": {
                "type": "array",
                "description": "Array of input events - each with type (key/mouse_button/joypad_button/joypad_axis) and binding details",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": [
                                "key",
                                "mouse_button",
                                "joypad_button",
                                "joypad_axis"
                            ],
                            "description": "Input event type"
                        },
                        "keycode": {
                            "type": "string",
                            "description": "For key: key name (e.g., \"Space\", \"W\", \"Escape\")"
                        },
                        "button": {
                            "type": "number",
                            "description": "For mouse_button: 1=left, 2=right, 3=middle; For joypad: button number"
                        },
                        "axis": {
                            "type": "number",
                            "description": "For joypad_axis: axis number (0-3)"
                        },
                        "axisValue": {
                            "type": "number",
                            "description": "For joypad_axis: direction (-1 or 1)"
                        },
                        "ctrl": {
                            "type": "boolean",
                            "description": "For key: require Ctrl modifier"
                        },
                        "alt": {
                            "type": "boolean",
                            "description": "For key: require Alt modifier"
                        },
                        "shift": {
                            "type": "boolean",
                            "description": "For key: require Shift modifier"
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            },
            "deadzone": {
                "type": "number",
                "description": "Analog stick deadzone (0-1). Default: 0.5"
            }
        },
        "required": [
            "projectPath",
            "actionName",
            "events"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "disable_plugin",
    description: "Disables a plugin in the project. Updates project.godot automatically. Plugin files remain in addons/ folder.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "pluginName": {
                "type": "string",
                "description": "Plugin folder name in addons/ (e.g., \"dialogue_manager\", \"scatter\")"
            }
        },
        "required": [
            "projectPath",
            "pluginName"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "enable_plugin",
    description: "Enables a plugin from addons/ folder. Updates project.godot automatically. Use list_plugins first to see available plugins.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "pluginName": {
                "type": "string",
                "description": "Plugin folder name in addons/ (e.g., \"dialogue_manager\", \"scatter\")"
            }
        },
        "required": [
            "projectPath",
            "pluginName"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "export_project",
    description: "Exports the project to a distributable format. Use to build final game executables. Requires export templates installed.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "preset": {
                "type": "string",
                "description": "Export preset name from export_presets.cfg (e.g., \"Windows Desktop\", \"Linux/X11\")"
            },
            "outputPath": {
                "type": "string",
                "description": "Destination path for exported file (e.g., \"builds/game.exe\", \"builds/game.x86_64\")"
            },
            "debug": {
                "type": "boolean",
                "description": "If true, exports debug build. Default: false (release)"
            }
        },
        "required": [
            "projectPath",
            "preset",
            "outputPath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "find_resource_usages",
    description: "Finds all files that reference a resource. Use before deleting or renaming to avoid breaking references.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Resource to search for (e.g., \"textures/player.png\")"
            },
            "fileTypes": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "File types to search. Default: [\"tscn\", \"tres\", \"gd\"]"
            }
        },
        "required": [
            "projectPath",
            "resourcePath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "get_dependencies",
    description: "Analyzes resource dependencies and detects circular references. Use to understand what a scene/script depends on before refactoring.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "resourcePath": {
                "type": "string",
                "description": "Path to analyze (e.g., \"scenes/player.tscn\", \"scripts/game.gd\")"
            },
            "depth": {
                "type": "number",
                "description": "How deep to traverse dependencies. -1 for unlimited. Default: -1"
            },
            "includeBuiltin": {
                "type": "boolean",
                "description": "If true, includes Godot built-in resources. Default: false"
            }
        },
        "required": [
            "projectPath",
            "resourcePath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "get_godot_version",
    description: "Returns the installed Godot engine version string. Use to check compatibility (e.g., Godot 4.4+ features like UID). Returns version like \"4.3.stable\" or \"4.4.dev\".",
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
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "get_project_health",
    description: "Generates a health report with scoring for project quality. Checks for unused resources, script errors, missing references, etc.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "includeDetails": {
                "type": "boolean",
                "description": "If true (default), includes detailed breakdown per category"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "get_project_info",
    description: "Returns metadata about a Godot project including name, version, main scene, autoloads, and directory structure. Use to understand project before modifying. Requires valid project.godot.",
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
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "get_project_setting",
    description: "Reads a value from project.godot settings. Use to check game name, window size, physics settings, etc.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "setting": {
                "type": "string",
                "description": "Setting path (e.g., \"application/config/name\", \"display/window/size/width\", \"physics/2d/default_gravity\")"
            }
        },
        "required": [
            "projectPath",
            "setting"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "list_autoloads",
    description: "Lists all registered autoload singletons in the project. Shows name, path, and enabled status.",
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
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "list_export_presets",
    description: "Lists all export presets defined in export_presets.cfg. Use before export_project to see available targets (Windows, Linux, Android, etc.).",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "includeTemplateStatus": {
                "type": "boolean",
                "description": "If true (default), shows if export templates are installed."
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "list_plugins",
    description: "Lists all plugins in addons/ folder with enabled/disabled status. Use before enable_plugin or disable_plugin to see available plugins.",
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
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "list_projects",
    description: "Scans a directory for Godot projects (folders containing project.godot). Use to discover projects before using other tools. Returns array of {path, name}.",
    inputSchema: {
        "type": "object",
        "properties": {
            "directory": {
                "type": "string",
                "description": "Absolute path to search (e.g., \"/home/user/godot-projects\" on Linux, \"C:\\Games\" on Windows)"
            },
            "recursive": {
                "type": "boolean",
                "description": "If true, searches all subdirectories. If false (default), only checks immediate children."
            }
        },
        "required": [
            "directory"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "remove_autoload",
    description: "Unregisters an autoload singleton. Use to remove global managers no longer needed.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "name": {
                "type": "string",
                "description": "Singleton name to remove (e.g., \"GameManager\")"
            }
        },
        "required": [
            "projectPath",
            "name"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "scaffold_gameplay_prototype",
    description: "Creates a minimal playable prototype scaffold in one shot: main scene, player scene, basic nodes, common input actions, and optional starter player script.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot."
            },
            "scenePath": {
                "type": "string",
                "description": "Main scene path relative to project. Default: scenes/Main.tscn"
            },
            "playerScenePath": {
                "type": "string",
                "description": "Player scene path relative to project. Default: scenes/Player.tscn"
            },
            "includePlayerScript": {
                "type": "boolean",
                "description": "If true, creates scripts/player.gd starter script. Default: true"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "search_project",
    description: "Searches for text or regex patterns across project files. Use to find function usages, variable references, or TODOs. Returns file paths and line numbers.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "query": {
                "type": "string",
                "description": "Search text or regex pattern (e.g., \"player\", \"TODO\", \"func.*damage\")"
            },
            "fileTypes": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "File extensions to search. Default: [\"gd\", \"tscn\", \"tres\"]"
            },
            "regex": {
                "type": "boolean",
                "description": "If true, treats query as regex. Default: false"
            },
            "caseSensitive": {
                "type": "boolean",
                "description": "If true, case-sensitive search. Default: false"
            },
            "maxResults": {
                "type": "number",
                "description": "Maximum results to return. Default: 100"
            }
        },
        "required": [
            "projectPath",
            "query"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "set_main_scene",
    description: "Sets which scene loads first when the game starts. Updates application/run/main_scene in project.godot.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "scenePath": {
                "type": "string",
                "description": "Path to main scene (e.g., \"scenes/main_menu.tscn\", \"scenes/game.tscn\")"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "set_project_setting",
    description: "Writes a value to project.godot settings. Use to configure game name, window size, physics, etc.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "setting": {
                "type": "string",
                "description": "Setting path (e.g., \"application/config/name\", \"display/window/size/width\")"
            },
            "value": {
                "type": "string",
                "description": "Value to set (Godot auto-converts types)"
            }
        },
        "required": [
            "projectPath",
            "setting",
            "value"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  },
  {
    name: "validate_project",
    description: "Checks project for export issues: missing resources, script errors, configuration problems. Use before export_project.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Absolute path to project directory containing project.godot. Use the same path across all tool calls in a workflow."
            },
            "preset": {
                "type": "string",
                "description": "Optional: validate against specific export preset requirements"
            },
            "includeSuggestions": {
                "type": "boolean",
                "description": "If true (default), includes fix suggestions for each issue"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Project,
    executionPath: "headless",
  }
];
