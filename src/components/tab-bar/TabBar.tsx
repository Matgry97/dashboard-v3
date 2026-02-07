import { useDashboardStore } from "../../store/dashboard-store";
import styles from "./TabBar.module.css";

export function TabBar() {
  const tabs = useDashboardStore((s) => s.tabs);
  const activeTabId = useDashboardStore((s) => s.activeTabId);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const addTab = useDashboardStore((s) => s.addTab);
  const removeTab = useDashboardStore((s) => s.removeTab);

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.tabActive : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.name}
          {tabs.length > 1 && (
            <span
              className={styles.removeTab}
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button
        className={styles.addTab}
        onClick={() => addTab(`Tab ${tabs.length + 1}`)}
        title="Add tab"
      >
        +
      </button>
    </div>
  );
}
