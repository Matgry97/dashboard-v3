import { useEffect, useState } from "react";
import styles from "./ClockWidget.module.css";

export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.clock}>
      <span className={styles.time}>
        {now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })}
      </span>
      <span className={styles.date}>
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </span>
    </div>
  );
}
