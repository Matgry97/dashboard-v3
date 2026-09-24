import { useState } from "react";
import { TabBar } from "../tab-bar/TabBar";
import { Dashboard } from "../dashboard/Dashboard";
import { WidgetPicker } from "../widget-picker/WidgetPicker";
import { NewsTab } from "../news/NewsTab";
import { useDashboardStore, NEWS_TAB_ID } from "../../store/dashboard-store";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isNewsTab = useDashboardStore((s) => s.activeTabId === NEWS_TAB_ID);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <span className={styles.brandPrompt}>&gt;</span> DASHBOARD<span className={styles.brandCursor}>_</span>
        </span>
        {!isNewsTab && (
          <button className={styles.addWidgetBtn} onClick={() => setPickerOpen(true)}>
            + Add Widget
          </button>
        )}
      </header>
      <TabBar />
      <div className={styles.content}>
        {isNewsTab ? <NewsTab /> : <Dashboard />}
      </div>
      {pickerOpen && <WidgetPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
