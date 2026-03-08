# godot-flow

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)
[![](https://img.shields.io/github/last-commit/HaD0Yun/godot-flow 'Last Commit')](https://github.com/HaD0Yun/godot-flow/commits/main)
[![](https://img.shields.io/github/stars/HaD0Yun/godot-flow 'Stars')](https://github.com/HaD0Yun/godot-flow/stargazers)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)

**220 Godot functions through 4 MCP meta-tools. 342 tokens instead of 18,606.** ([measured](benchmark/evidence/benchmark-report.json))

`godot-flow` is a 3-layer architecture that lets AI assistants discover and execute Godot engine capabilities without loading massive tool schemas into context. Born from [GoPeak (godot-mcp)](https://github.com/HaD0Yun/godot-mcp), it compresses 220 individually-registered MCP tools into 4 meta-tools — a **54× token reduction** (measured via actual JSON-RPC `tools/list` responses). Adding functions costs zero extra tokens.

> **Successor to GoPeak**: 220 functions (110 more than GoPeak's 110), same Godot integration depth, radically smaller context footprint.

---

## Why godot-flow?

| Problem with traditional MCP | godot-flow Solution |
|---|---|
| 110+ tool schemas loaded into every prompt (~18,600 tokens) | 4 meta-tool schemas (~342 tokens) |
| AI context wasted on schema definitions | AI context focused on your actual task |
| Adding tools means even more token overhead | Adding functions costs zero extra tokens |
| Each tool is a separate registration | Functions are data in a searchable registry |

### The 54× Token Savings (Measured)

Measured by spawning both MCP servers and comparing actual `tools/list` JSON-RPC responses:

```
Server               Tools    Chars        Tokens~
──────────────────────────────────────────────────────
GoPeak (legacy)      110      74,423       18,606
GoPeak (compact)     21       15,358       3,840
godot-flow           4        1,367        342

Reduction: GoPeak legacy → godot-flow = 54.44× fewer chars
           GoPeak compact → godot-flow = 11.23× fewer chars
```

Token estimate: `chars ÷ 4` (GPT-family approximation).
Reproduce: `npx tsx scripts/benchmark-tokens.ts`
Evidence: [`benchmark/evidence/benchmark-report.json`](benchmark/evidence/benchmark-report.json)

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
│  Function Registry: 220 functions, 25 categories │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Layer 3: Execution Engines                     │
│  ┌──────────┐ ┌─────────┐ ┌─────┐ ┌─────┐      │
│  │ Headless │ │ Runtime │ │ LSP │ │ DAP │      │
│  │(188 fn)│ │ (18 fn) │ │(4fn)│ │(10fn)│     │
│  └──────────┘ └─────────┘ └─────┘ └─────┘      │
│  → Godot CLI / TCP:7777 / LSP:6005 / DAP:6006  │
└─────────────────────────────────────────────────┘
```

### 4 Execution Engines

| Engine | Port | Functions | How It Works |
|--------|------|-----------|--------------|
| **Headless** | — | 188 | Spawns `godot --headless --script` for each operation |
| **Runtime** | TCP 7777 | 18 | Connects to running Godot game via runtime addon |
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

## Function Reference (220 functions, 25 categories)

### Core (3)

| Function | Description |
|----------|-------------|
| `launch_editor` | Opens the Godot editor GUI for a project |
| `run_project` | Launches a Godot project and captures output |
| `stop_project` | Terminates the currently running Godot project |

### Scene (25)

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
| `list_animations_in_library` | List all animations in an AnimationPlayer within a scene |
| `get_animation_details` | Get detailed information for a specific animation |
| `get_animation_track_details` | Get track information and keyframe counts for an animation |
| `rename_animation` | Rename an animation within an AnimationPlayer |
| `duplicate_animation` | Duplicate an existing animation with a new name |
| `remove_animation` | Remove an animation from an AnimationPlayer |
| `add_scene_group_tag` | Add a group tag to a node in a scene file |
| `remove_scene_group_tag` | Remove a group tag from a node in a scene file |
| `list_scene_group_tags` | List all group tags on a node in a scene file |
| `batch_set_node_properties` | Set properties on multiple nodes in a single call |

### Animation (7)

| Function | Description |
|----------|-------------|
| `create_animation` | Creates a new animation in an AnimationPlayer |
| `add_animation_track` | Adds a property or method track to an animation |
| `create_animation_tree` | Creates an AnimationTree linked to an AnimationPlayer |
| `add_animation_state` | Adds a state to an AnimationTree state machine |
| `connect_animation_states` | Connects two states with a transition |
| `set_animation_tree_parameter` | Sets a parameter on an AnimationTree node |
| `play_animation` | Play an animation in an AnimationPlayer |
### Navigation (2)

| Function | Description |
|----------|-------------|
| `create_navigation_agent` | Creates a NavigationAgent for AI pathfinding |
| `create_navigation_region` | Creates a NavigationRegion for walkable areas |

### Resource (30)

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
| `export_mesh_library` | Exports MeshInstance3D nodes as a MeshLibrary resource |
| `resave_resources` | Resaves all scene/resource files to update UID references |
| `list_resource_properties` | List typed properties from a saved resource file |
| `batch_modify_resources` | Apply property changes to multiple resources in one call |
| `detect_resource_type` | Detect and return the resource type of a file |
| `clone_resource` | Deep-clone a resource to a new file path |
| `list_resource_directory` | List resources in a directory with type and UID metadata |
| `get_resource_metadata` | Read metadata from a resource file |
| `validate_resource_integrity` | Validate a resource file's internal consistency |
| `convert_resource_format` | Convert between text (.tres) and binary (.res) resource formats |
### Asset (3)

| Function | Description |
|----------|-------------|
| `search_assets` | Search CC0 assets across Poly Haven, AmbientCG, Kenney |
| `fetch_asset` | Download a CC0 asset to your project |
| `list_asset_providers` | List available asset providers and capabilities |

### Runtime (14)

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
| `wait_for_runtime_node` | Wait for a node to appear at a path in a running game |
| `await_runtime_signal` | Wait for a signal emission in a running game |
| `list_runtime_group_members` | List nodes in a group in a running game |

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

### Project (29)

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
| `batch_set_project_settings` | Set multiple project settings in one call |
| `search_project_setting` | Search project settings by key pattern |
| `get_project_statistics` | Compute project file statistics grouped by category |
| `list_gdextension_entries` | List registered GDExtension entries |
| `detect_project_features` | Detect enabled project features from settings |
| `list_scene_dependencies` | List resource dependencies for a scene file |
| `validate_export_presets` | Validate export presets configuration |
| `list_resource_uids` | List all UID-to-path mappings in the project |

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

### Rendering (4)

| Function | Description |
|----------|-------------|
| `create_environment` | Creates an Environment resource for 3D rendering settings |
| `create_world_environment` | Creates a WorldEnvironment node in a scene |
| `create_light` | Creates a light node (Directional, Omni, Spot, 2D) |
| `create_camera` | Creates a Camera2D or Camera3D node |

### Physics (5)

| Function | Description |
|----------|-------------|
| `configure_physics_layer` | Configures physics layer names in ProjectSettings |
| `create_physics_material` | Creates a PhysicsMaterial resource |
| `create_raycast` | Creates a RayCast2D or RayCast3D node |
| `set_collision_layer_mask` | Sets collision layer and mask on a physics node |
| `configure_navigation_layers` | Configures navigation layer names in ProjectSettings |

### Networking (3)

| Function | Description |
|----------|-------------|
| `create_http_request` | Creates an HTTPRequest node for web communication |
| `create_multiplayer_spawner` | Creates a MultiplayerSpawner for networked spawning |
| `create_multiplayer_synchronizer` | Creates a MultiplayerSynchronizer for property replication |

### Audio (1)

| Function | Description |
|----------|-------------|
| `create_audio_stream_player` | Creates an AudioStreamPlayer node (non-positional, 2D, or 3D) |

### Theme (2)

| Function | Description |
|----------|-------------|
| `create_theme` | Creates a Theme resource for UI styling |
| `apply_theme_to_node` | Applies a Theme resource to a Control node |

### FileSystem (9)

| Function | Description |
|----------|-------------|
| `list_project_tree` | List project files and directories recursively |
| `find_files_by_pattern` | Search project files by glob-like pattern |
| `read_text_file` | Read text file contents with optional line-range slicing |
| `write_text_file` | Write full text content to a file path |
| `ensure_directory` | Ensure a directory exists, creating missing parents |
| `copy_path` | Copy a file or directory tree to a new location |
| `move_path` | Move or rename a file/directory path |
| `delete_path` | Delete a file or directory path |
| `read_import_metadata` | Read and parse an asset's .import metadata file |

### Script Analysis (9)

| Function | Description |
|----------|-------------|
| `analyze_script_structure` | Analyze GDScript structure including methods, properties, signals |
| `validate_script_syntax` | Validate a GDScript file for syntax/compile errors |
| `get_script_inheritance_chain` | Resolve inheritance chain from script to native class |
| `extract_script_dependencies` | Extract preload/load references from script source |
| `list_script_methods` | List script methods with argument metadata |
| `list_script_signals` | List custom signals defined by a script |
| `list_script_exported_properties` | List exported script properties with type metadata |
| `list_script_constants` | List constants declared in a GDScript file |
| `create_script_from_template` | Generate a new script from predefined templates |

### ClassDB (7)

| Function | Description |
|----------|-------------|
| `list_class_methods` | List methods for an engine class with signature metadata |
| `list_class_signals` | List signals for a class with argument metadata |
| `list_class_enums` | Enumerate class enum definitions with integer values |
| `list_class_constants` | List integer constants defined on a class |
| `list_class_properties` | List class properties with type and hint metadata |
| `check_class_compatibility` | Validate class existence and parent compatibility |
| `instantiate_class_dynamic` | Instantiate a class dynamically via ClassDB |

### Shader (2)

| Function | Description |
|----------|-------------|
| `extract_shader_uniforms` | Parse a shader and return all declared uniforms |
| `validate_shader_syntax` | Load and validate a shader resource |

### Geometry (7)

| Function | Description |
|----------|-------------|
| `create_array_mesh` | Create an ArrayMesh resource from surface arrays |
| `append_surface_to_mesh` | Append a new surface to an existing ArrayMesh |
| `analyze_mesh_structure` | Inspect a mesh and return per-surface statistics |
| `create_trimesh_collision_shape` | Create a ConcavePolygonShape3D from mesh geometry |
| `create_convex_collision_shape` | Create a ConvexPolygonShape3D from mesh geometry |
| `create_curve2d` | Create and save a Curve2D resource from point data |
| `create_curve3d` | Create and save a Curve3D resource from point data |

### Localization (6)

| Function | Description |
|----------|-------------|
| `list_translation_locales` | Scan translation resources and list available locales |
| `get_translation_entry` | Read a translation message by key |
| `set_translation_entry` | Set or update a translation message |
| `remove_translation_entry` | Remove a translation message key |
| `export_translations_csv` | Export translations into a CSV table |
| `import_translations_csv` | Import translations from CSV into Translation resources |

### Editor (15)

| Function | Description |
|----------|-------------|
| `editor_scan_filesystem_changes` | Trigger EditorFileSystem rescan |
| `editor_reimport_files` | Reimport asset files through the editor pipeline |
| `editor_get_setting` | Read a single EditorSettings key |
| `editor_set_setting` | Write a single EditorSettings key |
| `editor_batch_get_settings` | Read multiple EditorSettings keys |
| `editor_batch_set_settings` | Write multiple EditorSettings keys |
| `editor_get_editor_paths` | Return editor config/data/cache paths |
| `editor_open_scene` | Open a scene in editor context |
| `editor_save_scene` | Save currently edited scene |
| `editor_save_scene_as` | Save scene under a new target path |
| `editor_close_scene` | Close scene tab in editor |
| `editor_list_open_scenes` | List currently open scenes |
| `editor_set_current_scene` | Switch current editor scene |
| `editor_select_node` | Select a node in the current scene |
| `editor_get_selected_nodes` | Get selected nodes from editor |

### Utility (2)

| Function | Description |
|----------|-------------|
| `get_system_info` | Return OS, CPU, and engine version information |
| `execute_external_command` | Execute an allowlisted external command |

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
| **Architecture** | 110 individual MCP tools | 4 meta-tools + function registry |
| **Context cost** | ~18,600 tokens per session (measured) | ~342 tokens per session (measured) |
| **Function count** | 110 | 220 |
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

## Testing & Verification

godot-flow에는 별도 테스트 프레임워크(jest, vitest 등)가 없습니다. 대신 **구조적 검증**과 **실행 기반 검증** 두 축으로 품질을 보장합니다.

### 빌드 & 타입 검증

모든 소스는 TypeScript strict 모드로 컴파일됩니다. `as any`, `@ts-ignore`, `@ts-expect-error` 같은 타입 우회가 전혀 없습니다.

```bash
# 타입 체크 (빌드 없이)
npm run typecheck

# 빌드
npm run build
```

통과 기준: 에러 0건. 29개 소스 파일 전체가 strict 타입 체크를 통과해야 합니다.

### 레지스트리 무결성 검증

레지스트리에 등록된 220개 함수가 실제 GDScript(`godot_operations.gd`)와 일치하는지 확인하는 검증 스크립트가 포함되어 있습니다:

```bash
npx ts-node --esm scripts/validate-registry.ts
```

이 스크립트는 다음을 검증합니다:

- **함수 필드 완결성**: 모든 함수에 `name`, `description`, `category`, `executionPath`, `inputSchema`가 빠짐없이 있는지
- **이름 유일성**: 220개 함수 이름에 중복이 없는지
- **카테고리 유효성**: 모든 함수의 `category`가 정의된 25개 카테고리(core, scene, node, resource, asset, runtime, lsp, dap, project, debug, misc, rendering, physics, networking, audio, animation, theme, filesystem, scriptanalysis, classdb, shader, geometry, localization, editor, utility) 중 하나인지
- **실행 경로 유효성**: `executionPath`가 4개(headless, runtime, lsp, dap) 중 하나인지
- **GDScript 교차 참조**: 레지스트리에 있는 headless 함수가 `godot_operations.gd`에도 존재하는지, 반대로 GDScript에만 있고 레지스트리에 없는 함수가 있는지 보고

### MCP 서버 검증

MCP 서버가 정확히 4개 메타-툴만 등록하고, JSON-RPC 프로토콜을 올바르게 구현하는지 확인합니다:

```bash
# MCP initialize 핸드셰이크 테스트
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/mcp/index.js

# tools/list로 등록된 도구 확인
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
  {"jsonrpc":"2.0","method":"notifications/initialized"}
  {"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/mcp/index.js
```

검증 포인트:
- `tools/list` 응답에 정확히 4개 도구(`Godot.listfunc`, `Godot.findfunc`, `Godot.viewfunc`, `Godot.execute`)가 나오는지
- 각 도구 응답에 `content`(사람이 읽는 텍스트)와 `structuredContent`(기계가 파싱하는 JSON) 두 필드가 모두 포함되는지
- 잘못된 함수명으로 `execute`를 호출했을 때 `FUNCTION_NOT_FOUND` 에러 코드와 함께 유사 함수 제안이 반환되는지
- 잘못된 인자 타입으로 호출했을 때 `VALIDATION_ERROR`가 Zod 검증 메시지와 함께 반환되는지

### CLI 검증

CLI가 4개 서브커맨드를 모두 올바르게 실행하는지 확인합니다:

```bash
# 전체 함수 목록 출력 — 110개가 나와야 함
godot-flow listfunc

# 카테고리 필터링 — dap 카테고리에 10개 함수
godot-flow listfunc --category dap

# 패턴 검색 — "break"로 검색하면 dap_set_breakpoint, dap_remove_breakpoint 포함
godot-flow findfunc break

# 함수 상세 조회 — inputSchema가 출력되어야 함
godot-flow viewfunc create_scene

# 실행 (Godot 프로젝트 경로 필요)
GODOT_FLOW_PROJECT_PATH=/path/to/project godot-flow exec get_project_info
```

### 직접 실행해 볼 수 있는 시나리오

Godot 프로젝트가 있다면, 아래 시나리오를 순서대로 실행해서 전체 파이프라인이 동작하는지 확인할 수 있습니다:

**시나리오 1: 함수 탐색 → 조회 → 실행 (Headless)**
```bash
# 1. scene 관련 함수 찾기
godot-flow findfunc scene --category scene

# 2. create_scene의 인자 확인
godot-flow viewfunc create_scene

# 3. 씬 생성 실행
godot-flow exec create_scene --args '{"scene_name": "TestEnemy", "root_type": "CharacterBody2D"}'

# 4. 결과 확인: res://scenes/TestEnemy.tscn 파일이 생성됨
```

**시나리오 2: LSP 진단 (에디터 실행 필요)**
```bash
# Godot 에디터가 열려 있어야 LSP 포트 6005가 활성화됨
godot-flow exec lsp_diagnostics --args '{"script_path": "res://scripts/player.gd"}'

# 에러/경고 목록이 JSON으로 반환됨
```

**시나리오 3: 런타임 인스펙션 (게임 실행 필요)**
```bash
# 1. 프로젝트 실행
godot-flow exec run_project

# 2. 라이브 씬 트리 조회
godot-flow exec inspect_runtime_tree

# 3. 스크린샷 캡처
godot-flow exec capture_screenshot

# 4. 프로젝트 종료
godot-flow exec stop_project
```

**시나리오 4: DAP 디버깅 (게임 실행 필요)**
```bash
# 1. 브레이크포인트 설정
godot-flow exec dap_set_breakpoint --args '{"path": "res://scripts/player.gd", "line": 42}'

# 2. 브레이크포인트에서 멈추면 스택 트레이스 확인
godot-flow exec dap_get_stack_trace

# 3. 변수 평가
godot-flow exec dap_evaluate --args '{"expression": "player.position"}'

# 4. 실행 계속
godot-flow exec dap_continue
```

### 코드 품질 기준

다음 기준을 모든 소스 파일에 적용합니다:

| 기준 | 상태 |
| --- | --- |
| `as any` / `@ts-ignore` / `@ts-expect-error` 사용 | 0건 |
| 의도 주석 없는 빈 catch 블록 | 0건 |
| 프로덕션 코드의 `console.log` | 0건 |
| 사용하지 않는 import | 0건 |
| MCP `server.tool()` 호출 수 | 정확히 4개 |
| 레지스트리 함수 수 | 정확히 220개 |
| SKILL.md 줄 수 | 각 100줄 미만 |

이 기준들은 grep 한 줄로 바로 검증할 수 있습니다:

```bash
# 타입 우회 확인
grep -rn 'as any\|@ts-ignore\|@ts-expect-error' src/

# 빈 catch 확인
grep -rn 'catch' src/ --include='*.ts' | grep -v '//' | grep '{}'

# console.log 확인
grep -rn 'console\.log' src/ --include='*.ts'

# server.tool() 횟수 확인
grep -c 'server.tool(' src/mcp/server.ts

# 레지스트리 함수 수 확인
node -e "const m=require('./dist/registry/index');console.log(m.registry.count())"
```
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
│   │   └── data/              # 25 category files with function definitions
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
│   │       ├── rendering.ts
│   │       ├── physics.ts
│   │       ├── networking.ts
│   │       ├── audio.ts
│   │       ├── theme.ts
│   │       ├── animation.ts
│   │       ├── classdb.ts
│   │       ├── filesystem.ts
│   │       ├── scriptanalysis.ts
│   │       ├── shader.ts
│   │       ├── geometry.ts
│   │       ├── localization.ts
│   │       ├── editor.ts
│   │       ├── utility.ts
│   │       └── index.ts
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

## Shell helper commands

`gopeak-cli` can now install shell hooks that detect supported AI CLI commands already present on your machine and wrap them with cached update + GitHub star prompts.

Supported command detection at setup time: `claude`, `claudecode`, `codex`, `gemini`, `copilot`, `opencode`, `omx`.

```bash
gopeak-cli setup
gopeak-cli check
gopeak-cli notify
gopeak-cli star
gopeak-cli uninstall
```
