import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const audioTools: FunctionDefinition[] = [
  {
    name: "create_audio_stream_player",
    description: "Creates an AudioStreamPlayer node in a scene. Supports AudioStreamPlayer (non-positional), AudioStreamPlayer2D (2D positional), and AudioStreamPlayer3D (3D positional). Use for music, sound effects, and ambient audio.",
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
                "description": "Name for the audio player node (default: \"AudioStreamPlayer\")"
            },
            "playerType": {
                "type": "string",
                "enum": ["AudioStreamPlayer", "AudioStreamPlayer2D", "AudioStreamPlayer3D"],
                "description": "Audio player type: non-positional (default), 2D positional, or 3D positional"
            },
            "audioPath": {
                "type": "string",
                "description": "Path to audio file relative to project (e.g., \"audio/music.ogg\"). If empty, no stream is assigned."
            },
            "bus": {
                "type": "string",
                "description": "Audio bus name to route output to (default: \"Master\")"
            },
            "autoplay": {
                "type": "boolean",
                "description": "If true, starts playing automatically when the scene loads (default: false)"
            }
        },
        "required": [
            "projectPath",
            "scenePath"
        ]
    },
    category: FunctionCategory.Audio,
    executionPath: "headless",
  }
];
