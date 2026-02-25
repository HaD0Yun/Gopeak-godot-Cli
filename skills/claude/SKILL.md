# Godot Flow

Godot game engine integration via 4 MCP tools. Discover, inspect, and execute 110+ Godot operations without memorizing individual tool schemas.

## When to Use

Activate when user mentions: godot, scene, node, script, game, GDScript, shader, tilemap, animation, export, 게임, 개발, godot-flow.

## MCP Tools

- **Godot.listfunc** — Browse all functions (optional category filter)
- **Godot.findfunc** — Search by keyword or pattern
- **Godot.viewfunc** — Get full schema and arguments for a specific function
- **Godot.execute** — Run a function with arguments

## 3-Step Workflow

Always follow this pattern — never guess function names or arguments:

1. **Discover**: `Godot.listfunc` or `Godot.findfunc("keyword")` to find available functions
2. **Inspect**: `Godot.viewfunc("function_name")` to see the exact required arguments
3. **Execute**: `Godot.execute("function_name", { args })` to run it

## Categories

scene, node, resource, asset, runtime, lsp, dap, project, debug, core, misc

## Example Workflows

### Create a scene
1. `Godot.findfunc("create_scene")` → find the function
2. `Godot.viewfunc("create_scene")` → check required args
3. `Godot.execute("create_scene", { projectPath: "...", scenePath: "..." })`

### Debug with breakpoints
1. `Godot.listfunc` with category `dap` → see all DAP functions
2. `Godot.viewfunc("dap_set_breakpoint")` → check args
3. `Godot.execute("dap_set_breakpoint", { file: "...", line: 10 })`

### Manage nodes
1. `Godot.findfunc("node")` → browse node operations
2. `Godot.viewfunc("add_node")` → inspect arguments
3. `Godot.execute("add_node", { ... })`

## Important Rules

- **Never guess** function names — always discover first with listfunc/findfunc
- **Never guess** arguments — always inspect with viewfunc before executing
- **Category filter** narrows results: use it when you know the domain (scene, dap, lsp, etc.)
- **Error handling**: execute returns `{ success, result, error }` — always check success field

## CLI Alternative

The `godot-flow` CLI provides the same operations: `godot-flow listfunc`, `godot-flow findfunc`, `godot-flow viewfunc`, `godot-flow exec`.
