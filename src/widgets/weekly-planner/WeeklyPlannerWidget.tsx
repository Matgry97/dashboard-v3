import styles from "./WeeklyPlannerWidget.module.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getWeekDates(): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0 = Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function WeeklyPlannerWidget() {
  const today = new Date();
  const dates = getWeekDates();

  return (
    <div className={styles.container}>
      {dates.map((date, i) => {
        const isToday = isSameDay(date, today);
        const isWeekend = i >= 5;
        return (
          <div
            key={i}
            className={`${styles.day} ${isToday ? styles.today : ""} ${isWeekend ? styles.weekend : ""}`}
          >
            <span className={styles.dayName}>{DAYS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
