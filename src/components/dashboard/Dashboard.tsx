import { useDashboardStore } from "../../store/dashboard-store";
import { getWidget } from "../../registry/widget-registry";
import { WidgetShell } from "../widget-shell/WidgetShell";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  if (!activeTab) return null;

  return (
    <div className={styles.grid}>
      {activeTab.widgets.length === 0 ? (
        <div className={styles.empty}>
          <span>No widgets yet.</span>
          <span>Click "Add Widget" to get started.</span>
        </div>
      ) : (
        activeTab.widgets.map((instance) => {
          const definition = getWidget(instance.widgetId);
          if (!definition) return null;
          const Component = definition.component;
          return (
            <WidgetShell
              key={instance.id}
              title={definition.name}
              size={instance.size}
              onRemove={() => removeWidget(activeTabId, instance.id)}
            >
              <Component instanceId={instance.id} />
            </WidgetShell>
          );
        })
      )}
    </div>
  );
}
