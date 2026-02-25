import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const runtimeTools: FunctionDefinition[] = [
  {
    name: "call_runtime_method",
    description: "Call a method on a node in a running Godot instance",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to the target node"
            },
            "method": {
                "type": "string",
                "description": "Method name to call"
            },
            "args": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Arguments to pass to the method (as JSON strings)"
            }
        },
        "required": [
            "projectPath",
            "nodePath",
            "method"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "capture_screenshot",
    description: "Capture a screenshot of the running Godot game viewport. Requires the runtime addon to be active (game must be running with the MCP runtime autoload).",
    inputSchema: {
        "type": "object",
        "properties": {
            "width": {
                "type": "number",
                "description": "Target width in pixels (default: current viewport width)"
            },
            "height": {
                "type": "number",
                "description": "Target height in pixels (default: current viewport height)"
            },
            "format": {
                "type": "string",
                "enum": [
                    "png",
                    "jpg"
                ],
                "description": "Image format (default: png)"
            }
        }
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "capture_viewport",
    description: "Capture a viewport texture as base64 image from the running Godot game. Similar to capture_screenshot but captures a specific viewport by path.",
    inputSchema: {
        "type": "object",
        "properties": {
            "viewportPath": {
                "type": "string",
                "description": "NodePath to the target Viewport node (default: root viewport)"
            },
            "width": {
                "type": "number",
                "description": "Target width in pixels"
            },
            "height": {
                "type": "number",
                "description": "Target height in pixels"
            }
        }
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "get_runtime_metrics",
    description: "Get performance metrics from a running Godot instance",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "metrics": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Specific metrics to retrieve (default: all)"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "get_runtime_status",
    description: "Checks if a Godot game instance is running and connected for live debugging. Use before other runtime tools.",
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
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "inject_action",
    description: "Simulate a Godot input action (press/release). Requires runtime addon.",
    inputSchema: {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": "Action name as defined in Input Map (e.g., \"ui_accept\", \"jump\")"
            },
            "pressed": {
                "type": "boolean",
                "description": "Whether to press (true) or release (false). Default: true"
            },
            "strength": {
                "type": "number",
                "description": "Action strength 0.0–1.0. Default: 1.0"
            }
        },
        "required": [
            "action"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "inject_key",
    description: "Simulate a keyboard key press/release in the running Godot game. Requires runtime addon.",
    inputSchema: {
        "type": "object",
        "properties": {
            "keycode": {
                "type": "string",
                "description": "Key name (e.g., \"A\", \"Space\", \"Escape\", \"Enter\")"
            },
            "pressed": {
                "type": "boolean",
                "description": "Press (true) or release (false). Default: true"
            },
            "shift": {
                "type": "boolean",
                "description": "Shift modifier. Default: false"
            },
            "ctrl": {
                "type": "boolean",
                "description": "Ctrl modifier. Default: false"
            },
            "alt": {
                "type": "boolean",
                "description": "Alt modifier. Default: false"
            }
        },
        "required": [
            "keycode"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "inject_mouse_click",
    description: "Simulate a mouse click at specified position in the running Godot game. Requires runtime addon.",
    inputSchema: {
        "type": "object",
        "properties": {
            "x": {
                "type": "number",
                "description": "X coordinate in viewport pixels"
            },
            "y": {
                "type": "number",
                "description": "Y coordinate in viewport pixels"
            },
            "button": {
                "type": "string",
                "enum": [
                    "left",
                    "right",
                    "middle"
                ],
                "description": "Mouse button. Default: left"
            },
            "pressed": {
                "type": "boolean",
                "description": "Press (true) or release (false). Default: true"
            },
            "doubleClick": {
                "type": "boolean",
                "description": "Double-click. Default: false"
            }
        },
        "required": [
            "x",
            "y"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "inject_mouse_motion",
    description: "Simulate mouse movement to a position in the running Godot game. Requires runtime addon.",
    inputSchema: {
        "type": "object",
        "properties": {
            "x": {
                "type": "number",
                "description": "Target X coordinate in viewport pixels"
            },
            "y": {
                "type": "number",
                "description": "Target Y coordinate in viewport pixels"
            },
            "relativeX": {
                "type": "number",
                "description": "Relative X movement delta"
            },
            "relativeY": {
                "type": "number",
                "description": "Relative Y movement delta"
            }
        },
        "required": [
            "x",
            "y"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "inspect_runtime_tree",
    description: "Inspect the scene tree of a running Godot instance",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to start inspection from (default: root)"
            },
            "depth": {
                "type": "number",
                "description": "Maximum depth to inspect (default: 3)"
            }
        },
        "required": [
            "projectPath"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  },
  {
    name: "set_runtime_property",
    description: "Set a property on a node in a running Godot instance",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "nodePath": {
                "type": "string",
                "description": "Path to the target node"
            },
            "property": {
                "type": "string",
                "description": "Property name to set"
            },
            "value": {
                "type": "string",
                "description": "Value to set (Godot handles type conversion)"
            }
        },
        "required": [
            "projectPath",
            "nodePath",
            "property",
            "value"
        ]
    },
    category: FunctionCategory.Runtime,
    executionPath: "runtime",
  }
];
