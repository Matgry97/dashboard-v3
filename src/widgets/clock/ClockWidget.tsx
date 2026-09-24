import { useEffect, useState } from "react";
import styles from "./ClockWidget.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.clock}>
      <span className={styles.time}>
        {pad(now.getHours())}
        <span className={styles.colon}>:</span>
        {pad(now.getMinutes())}
        <span className={styles.seconds}>{pad(now.getSeconds())}</span>
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
