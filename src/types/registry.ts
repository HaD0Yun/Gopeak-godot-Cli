export enum FunctionCategory {
  Core = 'core',
  Scene = 'scene',
  Node = 'node',
  Resource = 'resource',
  Asset = 'asset',
  Runtime = 'runtime',
  LSP = 'lsp',
  DAP = 'dap',
  Project = 'project',
  Debug = 'debug',
  Misc = 'misc',
  Rendering = 'rendering',
  Physics = 'physics',
  Networking = 'networking',
  Audio = 'audio',
  Animation = 'animation',
  Theme = 'theme',
}

export interface RegistrySearchResult {
  name: string;
  description: string;
  category: FunctionCategory;
  executionPath: 'headless' | 'runtime' | 'lsp' | 'dap';
}

export interface RegistryListResult {
  name: string;
  description: string;
  category: FunctionCategory;
  executionPath: 'headless' | 'runtime' | 'lsp' | 'dap';
}
