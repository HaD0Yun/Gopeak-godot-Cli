import type { FunctionDefinition } from '../../types/function.js';
import { FunctionCategory } from '../../types/registry.js';

export const assetTools: FunctionDefinition[] = [
  {
    name: "fetch_asset",
    description: "Download a CC0 asset from any supported source (Poly Haven, AmbientCG, Kenney) to your Godot project.",
    inputSchema: {
        "type": "object",
        "properties": {
            "projectPath": {
                "type": "string",
                "description": "Path to the Godot project directory"
            },
            "assetId": {
                "type": "string",
                "description": "Asset ID from search results"
            },
            "provider": {
                "type": "string",
                "enum": [
                    "polyhaven",
                    "ambientcg",
                    "kenney"
                ],
                "description": "Source provider for the asset"
            },
            "resolution": {
                "type": "string",
                "enum": [
                    "1k",
                    "2k",
                    "4k"
                ],
                "description": "Resolution for download (default: 2k, only for PolyHaven/AmbientCG)"
            },
            "targetFolder": {
                "type": "string",
                "description": "Target folder for download (default: downloaded_assets/<provider>)"
            }
        },
        "required": [
            "projectPath",
            "assetId",
            "provider"
        ]
    },
    category: FunctionCategory.Asset,
    executionPath: "headless",
  },
  {
    name: "list_asset_providers",
    description: "List all available CC0 asset providers and their capabilities.",
    inputSchema: {
        "type": "object",
        "properties": {},
        "required": []
    },
    category: FunctionCategory.Asset,
    executionPath: "headless",
  },
  {
    name: "search_assets",
    description: "Search for CC0 assets across multiple sources (Poly Haven, AmbientCG, Kenney). Returns results sorted by provider priority.",
    inputSchema: {
        "type": "object",
        "properties": {
            "keyword": {
                "type": "string",
                "description": "Search term (e.g., \"chair\", \"rock\", \"tree\")"
            },
            "assetType": {
                "type": "string",
                "enum": [
                    "models",
                    "textures",
                    "hdris",
                    "audio",
                    "2d"
                ],
                "description": "Type of asset to search (optional, searches all if not specified)"
            },
            "maxResults": {
                "type": "number",
                "description": "Maximum number of results to return (default: 10)"
            },
            "provider": {
                "type": "string",
                "enum": [
                    "all",
                    "polyhaven",
                    "ambientcg",
                    "kenney"
                ],
                "description": "Specific provider to search, or \"all\" for multi-source (default: all)"
            },
            "mode": {
                "type": "string",
                "enum": [
                    "parallel",
                    "sequential"
                ],
                "description": "Search mode: \"parallel\" queries all providers, \"sequential\" stops at first with results (default: parallel)"
            }
        },
        "required": [
            "keyword"
        ]
    },
    category: FunctionCategory.Asset,
    executionPath: "headless",
  }
];
