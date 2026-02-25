import type { FunctionDefinition } from '../../types/function.js';

export { coreTools } from './core.js';
export { sceneTools } from './scene.js';
export { nodeTools } from './node.js';
export { resourceTools } from './resource.js';
export { assetTools } from './asset.js';
export { runtimeTools } from './runtime.js';
export { lspTools } from './lsp.js';
export { dapTools } from './dap.js';
export { projectTools } from './project.js';
export { debugTools } from './debug.js';
export { miscTools } from './misc.js';

import { coreTools } from './core.js';
import { sceneTools } from './scene.js';
import { nodeTools } from './node.js';
import { resourceTools } from './resource.js';
import { assetTools } from './asset.js';
import { runtimeTools } from './runtime.js';
import { lspTools } from './lsp.js';
import { dapTools } from './dap.js';
import { projectTools } from './project.js';
import { debugTools } from './debug.js';
import { miscTools } from './misc.js';

export const allTools: FunctionDefinition[] = [
  ...coreTools,
  ...sceneTools,
  ...nodeTools,
  ...resourceTools,
  ...assetTools,
  ...runtimeTools,
  ...lspTools,
  ...dapTools,
  ...projectTools,
  ...debugTools,
  ...miscTools,
];
