import { useRef, useState } from "react";
import { useDashboardStore } from "../../store/dashboard-store";
import { getWidget } from "../../registry/widget-registry";
import { WidgetShell } from "../widget-shell/WidgetShell";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const resizeWidget = useDashboardStore((s) => s.resizeWidget);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
        activeTab.widgets.map((instance, idx) => {
          const definition = getWidget(instance.widgetId);
          if (!definition) return null;
          const Component = definition.component;
          return (
            <WidgetShell
              key={instance.id}
              title={definition.name}
              size={instance.size}
              onRemove={() => removeWidget(activeTabId, instance.id)}
              onResize={(size) => resizeWidget(activeTabId, instance.id, size)}
              draggable
              isDragging={dragIndex.current === idx && dragOverIndex !== null}
              isDragOver={dragOverIndex === idx && dragIndex.current !== idx}
              onDragStart={() => { dragIndex.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
              onDrop={() => {
                if (dragIndex.current === null || dragIndex.current === idx) {
                  setDragOverIndex(null);
                  return;
                }
                const next = [...activeTab.widgets];
                const [moved] = next.splice(dragIndex.current, 1);
                next.splice(idx, 0, moved);
                reorderWidgets(activeTabId, next);
                dragIndex.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setDragOverIndex(null);
              }}
            >
              <Component instanceId={instance.id} />
            </WidgetShell>
          );
        })
      )}
    </div>
  );
}
