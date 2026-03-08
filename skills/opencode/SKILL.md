# GopeakCLI

Godot game engine integration via 4 meta-tools. Discover, inspect, and execute 110+ Godot operations.

## Triggers
godot, scene, node, script, game, 게임, 개발, GopeakCLI

## MCP Tools
- **Godot.listfunc** — Browse all functions (optional category filter)
- **Godot.findfunc** — Search by keyword
- **Godot.viewfunc** — Get full schema for a specific function
- **Godot.execute** — Run a function with arguments

## Workflow Pattern
1. **Discover**: `Godot.listfunc` or `Godot.findfunc("keyword")` to find functions
2. **Inspect**: `Godot.viewfunc("function_name")` to see required arguments
3. **Execute**: `Godot.execute("function_name", { args })` to run it

## Categories
scene, node, resource, asset, runtime, lsp, dap, project, debug, core, misc

## Example Workflows
### Create a new scene
1. `findfunc("create_scene")` → find the function
2. `viewfunc("create_scene")` → check required args
3. `execute("create_scene", { projectPath: "...", scenePath: "..." })`

### Debug with breakpoints
1. `listfunc` with category "dap" → see DAP tools
2. `viewfunc("dap_set_breakpoint")` → check args
3. `execute("dap_set_breakpoint", { ... })`

## CLI Alternative
GopeakCLI listfunc, findfunc, viewfunc, exec commands also available.
