import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardTab, WidgetInstance } from "../types/dashboard";
import type { WidgetSize } from "../types/widget";
import { getWidget } from "../registry/widget-registry";
import { generateId } from "../utils/id";

interface DashboardState {
  tabs: DashboardTab[];
  activeTabId: string;
  setActiveTab: (tabId: string) => void;
  addTab: (name: string) => void;
  removeTab: (tabId: string) => void;
  addWidget: (tabId: string, widgetId: string) => void;
  removeWidget: (tabId: string, instanceId: string) => void;
  reorderWidgets: (tabId: string, widgets: WidgetInstance[]) => void;
  resizeWidget: (tabId: string, instanceId: string, size: WidgetSize) => void;
}

function createDefaultTab(): DashboardTab {
  return { id: generateId(), name: "Dashboard", widgets: [] };
}

const defaultTab = createDefaultTab();

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      tabs: [defaultTab],
      activeTabId: defaultTab.id,

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      addTab: (name) => {
        const tab = { id: generateId(), name, widgets: [] };
        set((state) => ({
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
        }));
      },

      removeTab: (tabId) =>
        set((state) => {
          if (state.tabs.length <= 1) return state;
          const remaining = state.tabs.filter((t) => t.id !== tabId);
          const activeTabId =
            state.activeTabId === tabId ? remaining[0].id : state.activeTabId;
          return { tabs: remaining, activeTabId };
        }),

      addWidget: (tabId, widgetId) => {
        const definition = getWidget(widgetId);
        if (!definition) return;
        const instance: WidgetInstance = {
          id: generateId(),
          widgetId,
          size: definition.defaultSize,
        };
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, widgets: [...tab.widgets, instance] }
              : tab
          ),
        }));
      },

      removeWidget: (tabId, instanceId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  widgets: tab.widgets.filter((w) => w.id !== instanceId),
                }
              : tab
          ),
        })),

      reorderWidgets: (tabId, widgets) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, widgets } : tab
          ),
        })),

      resizeWidget: (tabId, instanceId, size) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  widgets: tab.widgets.map((w) =>
                    w.id === instanceId ? { ...w, size } : w
                  ),
                }
              : tab
          ),
        })),
    }),
    { name: "dashboard-storage" }
  )
);
