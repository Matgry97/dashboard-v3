import { describe, it, expect, beforeEach } from "vitest";
import { useDashboardStore } from "./dashboard-store";
import { registerWidget, clearRegistry } from "../registry/widget-registry";
import type { WidgetDefinition } from "../types/widget";

const clockDef: WidgetDefinition = {
  id: "clock",
  name: "Clock",
  description: "A clock widget",
  component: () => null,
};

function getState() {
  return useDashboardStore.getState();
}

describe("dashboard-store", () => {
  beforeEach(() => {
    // Reset store to fresh state
    useDashboardStore.setState({
      tabs: [{ id: "tab-1", name: "Dashboard", widgets: [] }],
      activeTabId: "tab-1",
    });
    clearRegistry();
    registerWidget(clockDef);
  });

  describe("initial state", () => {
    it("has one tab", () => {
      expect(getState().tabs).toHaveLength(1);
    });

    it("active tab matches the first tab", () => {
      expect(getState().activeTabId).toBe(getState().tabs[0].id);
    });
  });

  describe("tabs", () => {
    it("adds a new tab and switches to it", () => {
      getState().addTab("Second");
      const { tabs, activeTabId } = getState();
      expect(tabs).toHaveLength(2);
      expect(tabs[1].name).toBe("Second");
      expect(activeTabId).toBe(tabs[1].id);
    });

    it("removes a tab", () => {
      getState().addTab("Second");
      const secondId = getState().tabs[1].id;
      getState().removeTab(secondId);
      expect(getState().tabs).toHaveLength(1);
    });

    it("switches active tab when active tab is removed", () => {
      getState().addTab("Second");
      const secondId = getState().tabs[1].id;
      // Active is now "Second"
      expect(getState().activeTabId).toBe(secondId);
      getState().removeTab(secondId);
      // Should fall back to first tab
      expect(getState().activeTabId).toBe(getState().tabs[0].id);
    });

    it("does not remove the last tab", () => {
      const onlyTabId = getState().tabs[0].id;
      getState().removeTab(onlyTabId);
      expect(getState().tabs).toHaveLength(1);
    });

    it("setActiveTab switches tabs", () => {
      getState().addTab("Second");
      const firstId = getState().tabs[0].id;
      getState().setActiveTab(firstId);
      expect(getState().activeTabId).toBe(firstId);
    });
  });

  describe("widgets", () => {
    it("adds a widget to a tab", () => {
      const tabId = getState().tabs[0].id;
      getState().addWidget(tabId, "clock");
      const widgets = getState().tabs[0].widgets;
      expect(widgets).toHaveLength(1);
      expect(widgets[0].widgetId).toBe("clock");
    });

    it("does nothing when adding unregistered widget", () => {
      const tabId = getState().tabs[0].id;
      getState().addWidget(tabId, "nonexistent");
      expect(getState().tabs[0].widgets).toHaveLength(0);
    });

    it("removes a widget from a tab", () => {
      const tabId = getState().tabs[0].id;
      getState().addWidget(tabId, "clock");
      const instanceId = getState().tabs[0].widgets[0].id;
      getState().removeWidget(tabId, instanceId);
      expect(getState().tabs[0].widgets).toHaveLength(0);
    });

    it("reorders widgets", () => {
      const tabId = getState().tabs[0].id;
      getState().addWidget(tabId, "clock");
      getState().addWidget(tabId, "clock");
      const [a, b] = getState().tabs[0].widgets;
      getState().reorderWidgets(tabId, [b, a]);
      const reordered = getState().tabs[0].widgets;
      expect(reordered[0].id).toBe(b.id);
      expect(reordered[1].id).toBe(a.id);
    });

    it("only affects the targeted tab", () => {
      getState().addTab("Second");
      const firstTabId = getState().tabs[0].id;
      const secondTabId = getState().tabs[1].id;
      getState().addWidget(firstTabId, "clock");
      expect(getState().tabs[0].widgets).toHaveLength(1);
      expect(getState().tabs[1].widgets).toHaveLength(0);
    });
  });
});
