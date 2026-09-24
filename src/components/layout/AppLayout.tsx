import { useEffect, useState } from "react";
import { TabBar } from "../tab-bar/TabBar";
import { Dashboard } from "../dashboard/Dashboard";
import { WidgetPicker } from "../widget-picker/WidgetPicker";
import { NewsTab } from "../news/NewsTab";
import { useDashboardStore, NEWS_TAB_ID } from "../../store/dashboard-store";
import styles from "./AppLayout.module.css";

function greetingFor(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Re-renders once a minute so the greeting and date stay current on an always-on screen. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function AppLayout() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isNewsTab = useDashboardStore((s) => s.activeTabId === NEWS_TAB_ID);
  const now = useMinute();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.greeting}>{greetingFor(now.getHours())}</h1>
          <span className={styles.date}>
            {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        {!isNewsTab && (
          <button className={styles.addWidgetBtn} onClick={() => setPickerOpen(true)}>
            <span aria-hidden="true">+</span> Add Widget
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
