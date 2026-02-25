import { allTools } from './data/index.js';
import type { FunctionDefinition } from '../types/function.js';
import type { RegistryListResult, RegistrySearchResult } from '../types/registry.js';
import { FunctionCategory } from '../types/registry.js';

class FunctionRegistry {
  private readonly tools: Map<string, FunctionDefinition>;

  constructor(definitions: FunctionDefinition[]) {
    this.tools = new Map(definitions.map((definition) => [definition.name, definition]));
  }

  list(category?: string): RegistryListResult[] {
    const normalizedCategory = category?.trim().toLowerCase();

    return Array.from(this.tools.values())
      .filter((tool) => !normalizedCategory || tool.category === normalizedCategory)
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        executionPath: tool.executionPath,
      }));
  }

  search(pattern: string, category?: string): RegistrySearchResult[] {
    const normalizedPattern = pattern.trim().toLowerCase();
    const normalizedCategory = category?.trim().toLowerCase();

    return Array.from(this.tools.values())
      .filter((tool) => !normalizedCategory || tool.category === normalizedCategory)
      .filter((tool) => {
        const haystack = `${tool.name} ${tool.description}`.toLowerCase();

        return haystack.includes(normalizedPattern);
      })
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        executionPath: tool.executionPath,
      }));
  }

  get(name: string): FunctionDefinition | undefined {
    return this.tools.get(name);
  }

  categories(): Array<{ category: string; count: number }> {
    const counts = new Map<string, number>();

    for (const tool of this.tools.values()) {
      counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
    }

    return Object.values(FunctionCategory).map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    }));
  }

  count(): number {
    return this.tools.size;
  }
}

export const registry = new FunctionRegistry(allTools);
