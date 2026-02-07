import { getAllWidgets } from "../../registry/widget-registry";
import { useDashboardStore } from "../../store/dashboard-store";
import styles from "./WidgetPicker.module.css";

interface WidgetPickerProps {
  onClose: () => void;
}

export function WidgetPicker({ onClose }: WidgetPickerProps) {
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const widgets = getAllWidgets();

  function handleAdd(widgetId: string) {
    addWidget(activeTabId, widgetId);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Add Widget</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.list}>
          {widgets.length === 0 ? (
            <div className={styles.empty}>No widgets registered.</div>
          ) : (
            widgets.map((w) => (
              <div key={w.id} className={styles.widgetCard}>
                <div className={styles.widgetInfo}>
                  <span className={styles.widgetName}>{w.name}</span>
                  <span className={styles.widgetDesc}>{w.description}</span>
                </div>
                <button className={styles.addBtn} onClick={() => handleAdd(w.id)}>
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
