# godot-flow

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)
[![](https://img.shields.io/github/last-commit/HaD0Yun/godot-flow 'Last Commit')](https://github.com/HaD0Yun/godot-flow/commits/main)
[![](https://img.shields.io/github/stars/HaD0Yun/godot-flow 'Stars')](https://github.com/HaD0Yun/godot-flow/stargazers)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)

**110 Godot functions through 4 MCP meta-tools. ~200 tokens instead of ~15,000.**

`godot-flow` is a 3-layer architecture that lets AI assistants discover and execute Godot engine capabilities without loading massive tool schemas into context. Born from [GoPeak (godot-mcp)](https://github.com/HaD0Yun/godot-mcp), it compresses 110 individually-registered MCP tools into 4 meta-tools — a **63.86× token reduction**.

> **Successor to GoPeak**: Same 110 functions, same Godot integration depth, radically smaller context footprint.

---

## Why godot-flow?

| Problem with traditional MCP | godot-flow Solution |
|---|---|
| 110 tool schemas loaded into every prompt (~15,000 tokens) | 4 meta-tool schemas (~200 tokens) |
| AI context wasted on schema definitions | AI context focused on your actual task |
| Adding tools means even more token overhead | Adding functions costs zero extra tokens |
| Each tool is a separate registration | Functions are data in a searchable registry |

### The 63× Token Savings

```
Before (GoPeak):  110 tools × ~3,000 chars each = 328,952 chars in context
After (godot-flow): 4 meta-tools × ~1,300 chars each = 5,151 chars in context

Reduction: 63.86×
```

The AI discovers functions on-demand via `listfunc`/`findfunc`/`viewfunc`, then executes with `execute`. No upfront schema loading.

---

## 3-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 1: AI Client                             │
│  Claude / OpenCode / Codex / CLI                │
│  → Calls 4 meta-tools or CLI commands           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Layer 2: MCP Routing (godot-flow)              │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐ │
│  │ listfunc  │ │ findfunc  │ │   viewfunc     │ │
│  └───────────┘ └───────────┘ └────────────────┘ │
│  ┌────────────────────────────────────────────┐  │
│  │             execute                        │  │
│  │  → Zod validates input against schema      │  │
│  │  → Routes by executionPath                 │  │
│  └────────────────────────────────────────────┘  │
│  Function Registry: 110 functions, 11 categories │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Layer 3: Execution Engines                     │
│  ┌──────────┐ ┌─────────┐ ┌─────┐ ┌─────┐      │
│  │ Headless │ │ Runtime │ │ LSP │ │ DAP │      │
│  │ (81 fn)  │ │ (15 fn) │ │(4fn)│ │(10fn)│     │
│  └──────────┘ └─────────┘ └─────┘ └─────┘      │
│  → Godot CLI / TCP:7777 / LSP:6005 / DAP:6006  │
└─────────────────────────────────────────────────┘
```

### 4 Execution Engines

| Engine | Port | Functions | How It Works |
|--------|------|-----------|--------------|
| **Headless** | — | 81 | Spawns `godot --headless --script` for each operation |
| **Runtime** | TCP 7777 | 15 | Connects to running Godot game via runtime addon |
| **LSP** | 6005 | 4 | Communicates with Godot's built-in Language Server |
| **DAP** | 6006 | 10 | Manages Debug Adapter Protocol sessions with background daemon |

---

## Requirements

- **Godot 4.x** (4.3+ recommended, 4.4+ for UID features)
- **Node.js 18+**
- MCP-compatible client (Claude Desktop, Cursor, Cline, OpenCode, Codex, etc.)

---

## Installation

### Quick Start (recommended)

```bash
npx godot-flow listfunc
```

### Global Install

```bash
npm install -g godot-flow
godot-flow listfunc
```

### From Source

```bash
git clone https://github.com/HaD0Yun/godot-flow.git
cd godot-flow
npm install
npm run build
```

---

## MCP Client Configuration

### Claude Desktop / Cursor / Cline

```json
{
  "mcpServers": {
    "godot-flow": {
      "command": "godot-flow",
      "args": [],
      "env": {
        "GODOT_FLOW_PROJECT_PATH": "/path/to/your/godot/project",
        "GODOT_FLOW_GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

### OpenCode

```json
{
  "mcp": {
    "servers": {
      "godot-flow": {
        "command": "godot-flow",
        "args": [],
        "env": {
          "GODOT_FLOW_PROJECT_PATH": "/path/to/your/godot/project"
        }
      }
    }
  }
}
```

### npx Mode (no global install)

```json
{
  "mcpServers": {
    "godot-flow": {
      "command": "npx",
      "args": ["-y", "godot-flow"],
      "env": {
        "GODOT_FLOW_PROJECT_PATH": "/path/to/your/godot/project"
      }
    }
  }
}
```

---

## 4 MCP Meta-Tools

These are the **only 4 tools** exposed to your AI assistant:

### `Godot.listfunc`

List all available functions, optionally filtered by category.

```
Input:  { category?: string }
Output: Array of { name, description, category, executionPath }
```

### `Godot.findfunc`

Search functions by text pattern with optional category filter.

```
Input:  { pattern: string, category?: string }
Output: Matching functions with name, description, category
```

### `Godot.viewfunc`

Inspect a single function's full definition including its input schema.

```
Input:  { name: string }
Output: { name, description, category, executionPath, inputSchema }
```

### `Godot.execute`

Execute a function with Zod-validated arguments routed to the correct engine.

```
Input:  { name: string, args?: object }
Output: Execution result (engine-specific)
```

All 4 tools return both human-readable `content` (text) and machine-readable `structuredContent` (JSON) for maximum interoperability.

---

## CLI Usage

The CLI mirrors the MCP tools for terminal use and debugging:

```bash
# List all functions
godot-flow listfunc

# List functions in a category
godot-flow listfunc --category scene

# Search for functions
godot-flow findfunc "breakpoint"
godot-flow findfunc "script" --category resource

# View function details (including input schema)
godot-flow viewfunc create_scene

# Execute a function
godot-flow exec create_scene --args '{"scene_name": "Player", "root_type": "CharacterBody2D"}'
godot-flow exec run_project
godot-flow exec lsp_diagnostics --args '{"script_path": "res://scripts/player.gd"}'

# Install AI platform skill files
godot-flow install-skill --platform opencode
godot-flow install-skill --platform claude
godot-flow install-skill --platform codex
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GODOT_FLOW_PROJECT_PATH` | Godot project root (must contain `project.godot`) | (required for most operations) |
| `GODOT_FLOW_GODOT_PATH` | Path to Godot executable | `godot` |
| `GODOT_FLOW_RUNTIME_PORT` | Runtime bridge TCP port | `7777` |
| `GODOT_FLOW_LSP_PORT` | Godot Language Server port | `6005` |
| `GODOT_FLOW_DAP_PORT` | Godot Debug Adapter port | `6006` |
| `GODOT_FLOW_TIMEOUT` | Command execution timeout (ms) | `30000` |

---

## AI Platform Skills

godot-flow includes lightweight SKILL.md files (< 100 lines each) that teach AI assistants the optimal workflow patterns without embedding full schemas:

| Platform | Install Command | Lines |
|----------|----------------|-------|
| OpenCode | `godot-flow install-skill --platform opencode` | 34 |
| Claude | `godot-flow install-skill --platform claude` | 54 |
| Codex | `godot-flow install-skill --platform codex` | 54 |

Skills teach the AI the **discover → inspect → execute** pattern:
1. `findfunc` or `listfunc` to discover what's available
2. `viewfunc` to read the input schema
3. `execute` to run with validated arguments

---

## Function Reference (110 functions)

### Core (3)

| Function | Description |
|----------|-------------|
| `launch_editor` | Opens the Godot editor GUI for a project |
| `run_project` | Launches a Godot project and captures output |
| `stop_project` | Terminates the currently running Godot project |

### Scene (15)

| Function | Description |
|----------|-------------|
| `create_scene` | Creates a new scene file (.tscn) with a root node |
| `save_scene` | Saves changes to a scene file |
| `list_scene_nodes` | Returns complete scene tree with hierarchy |
| `add_node` | Adds any node type to an existing scene |
| `delete_node` | Removes a node and its children |
| `duplicate_node` | Copies a node with properties and children |
| `reparent_node` | Moves a node to a different parent |
| `set_node_properties` | Sets multiple properties on a scene node |
| `get_node_properties` | Returns all properties of a scene node |
| `load_sprite` | Assigns a texture to a Sprite2D node |
| `connect_signal` | Creates a signal connection between nodes |
| `disconnect_signal` | Removes a signal connection |
| `list_connections` | Lists all signal connections in a scene |
| `create_tileset` | Creates a TileSet from texture atlases |
| `set_tilemap_cells` | Places tiles in a TileMap node |

### Animation (5)

| Function | Description |
|----------|-------------|
| `create_animation` | Creates a new animation in an AnimationPlayer |
| `add_animation_track` | Adds a property or method track to an animation |
| `create_animation_tree` | Creates an AnimationTree linked to an AnimationPlayer |
| `add_animation_state` | Adds a state to an AnimationTree state machine |
| `connect_animation_states` | Connects two states with a transition |

### Navigation (2)

| Function | Description |
|----------|-------------|
| `create_navigation_agent` | Creates a NavigationAgent for AI pathfinding |
| `create_navigation_region` | Creates a NavigationRegion for walkable areas |

### Resource (20)

| Function | Description |
|----------|-------------|
| `create_script` | Creates a GDScript file with optional templates |
| `modify_script` | Adds functions/variables/signals to existing scripts |
| `get_script_info` | Analyzes GDScript structure (functions, variables, signals) |
| `create_resource` | Creates any resource type as a .tres file |
| `modify_resource` | Modifies properties of existing resources |
| `create_material` | Creates materials (StandardMaterial3D, ShaderMaterial, etc.) |
| `create_shader` | Creates shader files with optional templates |
| `apply_theme_shader` | Generates and applies theme-appropriate shaders |
| `set_theme_color` | Sets a color in a Theme resource |
| `set_theme_font_size` | Sets a font size in a Theme resource |
| `create_audio_bus` | Creates audio buses for mixing |
| `get_audio_buses` | Lists all audio buses and configuration |
| `set_audio_bus_volume` | Sets volume for an audio bus |
| `set_audio_bus_effect` | Adds/configures audio effects on a bus |
| `reimport_resource` | Forces reimport of resources |
| `get_import_options` | Returns current import settings |
| `set_import_options` | Modifies import settings for resources |
| `get_import_status` | Returns import status for project resources |
| `get_uid` | Gets UID for a file (Godot 4.4+) |
| `update_project_uids` | Updates UID references in project (Godot 4.4+) |

### Asset (3)

| Function | Description |
|----------|-------------|
| `search_assets` | Search CC0 assets across Poly Haven, AmbientCG, Kenney |
| `fetch_asset` | Download a CC0 asset to your project |
| `list_asset_providers` | List available asset providers and capabilities |

### Runtime (11)

| Function | Description |
|----------|-------------|
| `get_runtime_status` | Checks if Godot game is running and connected |
| `inspect_runtime_tree` | Inspects the live scene tree |
| `set_runtime_property` | Sets a property on a node in running game |
| `call_runtime_method` | Calls a method on a node in running game |
| `get_runtime_metrics` | Gets performance metrics (FPS, memory, etc.) |
| `capture_screenshot` | Captures screenshot of running game viewport |
| `capture_viewport` | Captures viewport texture as base64 image |
| `inject_key` | Simulates keyboard key press/release |
| `inject_mouse_click` | Simulates mouse click at position |
| `inject_mouse_motion` | Simulates mouse movement |
| `inject_action` | Simulates Godot input action |

### LSP (4)

| Function | Description |
|----------|-------------|
| `lsp_diagnostics` | Gets GDScript diagnostics from Language Server |
| `lsp_completion` | Gets code completions at a position |
| `lsp_hover` | Gets hover information at a position |
| `lsp_goto_definition` | Gets go-to-definition target at a position |

### DAP — Debug Adapter (10)

| Function | Description |
|----------|-------------|
| `dap_set_breakpoint` | Sets a breakpoint at a specific line |
| `dap_remove_breakpoint` | Removes a breakpoint |
| `dap_continue` | Continues execution after breakpoint/pause |
| `dap_step_over` | Steps over the current line |
| `dap_step_into` | Steps into the current function call |
| `dap_step_out` | Steps out of the current function |
| `dap_pause` | Pauses execution |
| `dap_evaluate` | Evaluates an expression in debug context |
| `dap_get_stack_trace` | Gets current stack trace |
| `dap_get_output` | Gets captured DAP console output |

### Project (21)

| Function | Description |
|----------|-------------|
| `get_project_info` | Returns project metadata (name, version, main scene, etc.) |
| `get_project_setting` | Reads a value from project.godot |
| `set_project_setting` | Writes a value to project.godot |
| `set_main_scene` | Sets the first scene loaded at startup |
| `get_godot_version` | Returns installed Godot version |
| `list_projects` | Scans directory for Godot projects |
| `search_project` | Searches for text/regex patterns across project files |
| `validate_project` | Checks project for export issues |
| `export_project` | Exports to distributable format |
| `list_export_presets` | Lists export presets from export_presets.cfg |
| `get_project_health` | Generates health report with scoring |
| `get_dependencies` | Analyzes resource dependencies |
| `find_resource_usages` | Finds all files referencing a resource |
| `add_autoload` | Registers an autoload singleton |
| `remove_autoload` | Unregisters an autoload singleton |
| `list_autoloads` | Lists all autoload singletons |
| `add_input_action` | Registers input actions in InputMap |
| `enable_plugin` | Enables a plugin from addons/ |
| `disable_plugin` | Disables a plugin |
| `list_plugins` | Lists plugins with enabled/disabled status |
| `scaffold_gameplay_prototype` | Creates a minimal playable prototype in one shot |

### Debug (4)

| Function | Description |
|----------|-------------|
| `get_debug_output` | Retrieves console output from running project |
| `parse_error_log` | Parses error log with fix suggestions |
| `validate_patch_with_lsp` | Runs LSP diagnostics to validate script changes |
| `enforce_version_gate` | Checks Godot version against requirements |

### Misc (12)

| Function | Description |
|----------|-------------|
| `query_classes` | Query available Godot classes from ClassDB |
| `query_class_info` | Get detailed class info (methods, properties, signals) |
| `inspect_inheritance` | Inspect class inheritance hierarchy |
| `capture_intent_snapshot` | Capture intent snapshot for current work |
| `record_decision_log` | Record structured decision with rationale |
| `record_execution_trace` | Record execution trace for a work step |
| `record_work_step` | Unified: trace + optional handoff refresh |
| `generate_handoff_brief` | Generate handoff brief from saved context |
| `export_handoff_pack` | Export machine-readable handoff pack |
| `summarize_intent_context` | Summarize current intent context |
| `get_recording_mode` | Get current recording mode status |
| `set_recording_mode` | Set recording mode (lite/full) |

---

## Prompt Examples

### Build a Game

```
"Create a Player scene with CharacterBody2D, Sprite2D, CollisionShape2D,
and a basic movement script."

"Add an enemy spawner scene and wire spawn signals to GameManager."

"Scaffold a platformer prototype with player, enemies, and a test level."
```

### Debug & Test

```
"Run the project, collect errors, and fix the top 3 issues."

"Set a breakpoint at scripts/player.gd:42, continue execution,
and show the stack trace when hit."

"Get LSP diagnostics for all scripts and summarize the warnings."
```

### Runtime Inspection

```
"Press ui_accept, move mouse to (400, 300), click, then capture a screenshot."

"Inspect the live scene tree and report nodes with missing scripts."

"Get FPS and memory metrics from the running game."
```

### Project Management

```
"Analyze project health and list quick wins before release."

"Find all TODO/FIXME comments and group them by file."

"Search for all usages of the player_health signal."
```

---

## Comparison: godot-flow vs GoPeak

| | GoPeak | godot-flow |
|---|---|---|
| **Architecture** | 97+ individual MCP tools | 4 meta-tools + function registry |
| **Context cost** | ~15,000 tokens per session | ~200 tokens per session |
| **Function count** | 97 → 110 | 110 |
| **Execution engines** | 4 (headless, runtime, LSP, DAP) | 4 (same engines, cleaner routing) |
| **Input validation** | Per-tool Zod schemas | Dynamic Zod from registry schemas |
| **Adding functions** | New `server.tool()` + schema | Add entry to registry data file |
| **AI platform support** | MCP only | MCP + CLI + SKILL.md per platform |
| **Structured responses** | text only | text + structuredContent JSON |

---

## How It Works Internally

### Discovery Flow

```
AI: "How do I create a scene?"
  → Godot.findfunc({ pattern: "scene" })
  → Returns: create_scene, save_scene, list_scene_nodes, ...

AI: "What args does create_scene need?"
  → Godot.viewfunc({ name: "create_scene" })
  → Returns: { inputSchema: { scene_name: string, root_type: string, ... } }

AI: "Create a Player scene"
  → Godot.execute({ name: "create_scene", args: { scene_name: "Player", root_type: "CharacterBody2D" } })
  → Zod validates args → routes to headless engine → spawns godot --headless
  → Returns: { success: true, path: "res://scenes/Player.tscn" }
```

### Error Handling

All errors use structured JSON format:

```json
{
  "error": {
    "code": "FUNCTION_NOT_FOUND",
    "message": "Function 'create_scen' not found",
    "details": {
      "suggestions": ["create_scene"]
    }
  }
}
```

Error codes: `FUNCTION_NOT_FOUND`, `VALIDATION_ERROR`, `EXECUTION_ERROR`, `ENGINE_ERROR`, `REGISTRY_ERROR`, `INVALID_ARGS`, `TIMEOUT`

---

## DAP Background Daemon

The DAP engine uses a background daemon for persistent debug sessions:

- **Automatic lifecycle**: Starts on first DAP function call, stops when idle
- **PID file management**: Prevents duplicate daemons
- **Crash recovery**: Auto-restarts on unexpected termination
- **Session persistence**: Breakpoints and state maintained across calls

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Godot not found** | Set `GODOT_FLOW_GODOT_PATH` to your Godot executable |
| **No MCP tools visible** | Restart your MCP client after configuration |
| **Project path invalid** | Ensure path contains `project.godot` |
| **Runtime tools not working** | Start the game with `run_project` first, ensure runtime addon is enabled |
| **LSP connection refused** | Open project in Godot editor (starts LSP automatically on port 6005) |
| **DAP not connecting** | Ensure no other debugger is connected on port 6006 |
| **Timeout errors** | Increase `GODOT_FLOW_TIMEOUT` for large projects |

---

## Project Structure

```
godot-flow/
├── src/
│   ├── mcp/
│   │   ├── server.ts          # 4 meta-tools (listfunc, findfunc, viewfunc, execute)
│   │   └── index.ts           # StdioServerTransport entry point
│   ├── registry/
│   │   ├── index.ts           # FunctionRegistry class (list, search, get)
│   │   └── data/              # 12 category files with function definitions
│   │       ├── core.ts
│   │       ├── scene.ts
│   │       ├── node.ts
│   │       ├── resource.ts
│   │       ├── asset.ts
│   │       ├── runtime.ts
│   │       ├── lsp.ts
│   │       ├── dap.ts
│   │       ├── project.ts
│   │       ├── debug.ts
│   │       ├── misc.ts
│   │       └── priority1.ts
│   ├── engine/
│   │   ├── headless.ts        # Godot --headless execution
│   │   ├── runtime.ts         # TCP:7777 runtime bridge
│   │   ├── lsp.ts             # Language Server Protocol client
│   │   └── dap.ts             # Debug Adapter Protocol client
│   ├── daemon/
│   │   └── dap-daemon.ts      # Background DAP session manager
│   ├── cli.ts                 # CLI interface (commander)
│   ├── config.ts              # GODOT_FLOW_* environment config
│   ├── errors.ts              # GodotFlowError (structured JSON errors)
│   ├── schema-utils.ts        # JSON Schema → Zod converter
│   └── types/                 # TypeScript type definitions
├── skills/
│   ├── opencode/SKILL.md      # OpenCode AI skill file
│   ├── claude/SKILL.md        # Claude AI skill file
│   └── codex/SKILL.md         # Codex AI skill file
├── scripts/
│   └── validate-registry.ts   # Registry ↔ GDScript sync checker
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checks (`npm run typecheck`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Adding New Functions

To add a new Godot function, create an entry in the appropriate `src/registry/data/*.ts` file:

```typescript
{
  name: 'my_new_function',
  description: 'What this function does',
  category: FunctionCategory.Scene, // or Node, Resource, etc.
  executionPath: ExecutionPath.Headless, // or Runtime, LSP, DAP
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' },
    },
    required: ['param1'],
  },
}
```

No MCP registration needed — the registry automatically exposes it through the 4 meta-tools.

---

## License

MIT — see [LICENSE](LICENSE).

## Credits

- Original MCP server by [Coding-Solo](https://github.com/Coding-Solo/godot-mcp)
- GoPeak enhancements by [HaD0Yun](https://github.com/HaD0Yun)
- godot-flow architecture by [HaD0Yun](https://github.com/HaD0Yun)
