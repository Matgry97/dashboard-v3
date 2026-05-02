import { useState } from "react";
import { TabBar } from "../tab-bar/TabBar";
import { Dashboard } from "../dashboard/Dashboard";
import { WidgetPicker } from "../widget-picker/WidgetPicker";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <span className={styles.brandPrompt}>&gt;</span> DASHBOARD<span className={styles.brandCursor}>_</span>
        </span>
        <button className={styles.addWidgetBtn} onClick={() => setPickerOpen(true)}>
          + Add Widget
        </button>
      </header>
      <TabBar />
      <div className={styles.content}>
        <Dashboard />
      </div>
      {pickerOpen && <WidgetPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
