import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerWidget,
  getWidget,
  getAllWidgets,
  clearRegistry,
} from "./widget-registry";
import type { WidgetDefinition } from "../types/widget";

function makeDef(id: string): WidgetDefinition {
  return {
    id,
    name: `Widget ${id}`,
    description: `Description for ${id}`,
    component: () => null,
  };
}

describe("widget-registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and retrieves a widget", () => {
    const def = makeDef("test");
    registerWidget(def);
    expect(getWidget("test")).toBe(def);
  });

  it("returns undefined for unknown widget", () => {
    expect(getWidget("nonexistent")).toBeUndefined();
  });

  it("returns all registered widgets", () => {
    registerWidget(makeDef("a"));
    registerWidget(makeDef("b"));
    registerWidget(makeDef("c"));
    expect(getAllWidgets()).toHaveLength(3);
  });

  it("warns and skips on duplicate registration", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = makeDef("dup");
    registerWidget(original);
    registerWidget(makeDef("dup"));

    expect(warn).toHaveBeenCalledOnce();
    expect(getWidget("dup")).toBe(original);
    warn.mockRestore();
  });

  it("returns empty array when nothing is registered", () => {
    expect(getAllWidgets()).toEqual([]);
  });
});
