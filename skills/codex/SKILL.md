# Godot Flow

Godot game engine integration via 4 MCP tools. Discover, inspect, and execute 110+ Godot operations.

## Triggers

godot, scene, node, script, game, GDScript, shader, tilemap, animation, export, 게임, 개발, godot-flow

## MCP Tools

- **Godot.listfunc** — Browse all functions (optional category filter)
- **Godot.findfunc** — Search by keyword or pattern
- **Godot.viewfunc** — Get full schema and arguments for a specific function
- **Godot.execute** — Run a function with arguments

## Workflow Pattern

Always follow discover → inspect → execute. Never guess function names or arguments.

1. **Discover**: `Godot.listfunc` or `Godot.findfunc("keyword")` to find functions
2. **Inspect**: `Godot.viewfunc("function_name")` to see required arguments
3. **Execute**: `Godot.execute("function_name", { args })` to run it

## Categories

scene, node, resource, asset, runtime, lsp, dap, project, debug, core, misc

## Example Workflows

### Create a scene
1. `findfunc("create_scene")` → find the function
2. `viewfunc("create_scene")` → check required args
3. `execute("create_scene", { projectPath: "...", scenePath: "..." })`

### Debug with breakpoints
1. `listfunc` with category "dap" → see DAP tools
2. `viewfunc("dap_set_breakpoint")` → check args
3. `execute("dap_set_breakpoint", { file: "...", line: 10 })`

### Manage nodes
1. `findfunc("node")` → browse node operations
2. `viewfunc("add_node")` → inspect arguments
3. `execute("add_node", { ... })`

## Rules

- Always discover before executing — never assume function names exist
- Always inspect before executing — never guess argument shapes
- Use category filter to narrow results when you know the domain
- Check the `success` field in execution results for error handling

## CLI Alternative

godot-flow listfunc, findfunc, viewfunc, exec commands also available.
