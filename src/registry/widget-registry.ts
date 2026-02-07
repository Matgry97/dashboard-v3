import type { WidgetDefinition } from "../types/widget";

const registry = new Map<string, WidgetDefinition>();

export function registerWidget(definition: WidgetDefinition): void {
  if (registry.has(definition.id)) {
    console.warn(`Widget "${definition.id}" is already registered.`);
    return;
  }
  registry.set(definition.id, definition);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return registry.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/** @internal — for tests only */
export function clearRegistry(): void {
  registry.clear();
}
