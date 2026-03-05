import { useEffect } from "react";
import { useWeatherStore } from "../../store/weather-store";
import styles from "./WeatherForecast.module.css";

interface DayForecast {
  day: string;
  temperature: number;
  symbolCode: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseForecast(timeseries: any[]): DayForecast[] {
  const today = new Date();
  const days: DayForecast[] = [];

  for (let offset = 1; offset <= 3; offset++) {
    const target = new Date(today);
    target.setDate(target.getDate() + offset);
    const targetDate = localDateStr(target);

    let best: any = null;
    let bestDiff = Infinity;

    for (const entry of timeseries) {
      const time = new Date(entry.time);
      if (localDateStr(time) !== targetDate) continue;
      const diff = Math.abs(time.getHours() - 12);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = entry;
      }
    }

    if (best) {
      const details = best.data.instant.details;
      const symbolCode =
        best.data.next_6_hours?.summary?.symbol_code ??
        best.data.next_1_hours?.summary?.symbol_code ??
        "cloudy";

      days.push({
        day: DAY_NAMES[target.getDay()],
        temperature: details.air_temperature,
        symbolCode,
      });
    }
  }

  return days;
}

export function WeatherForecast(_props: { instanceId: string }) {
  const { timeseries, status, fetchIfNeeded } = useWeatherStore();

  useEffect(() => {
    fetchIfNeeded();
  }, [fetchIfNeeded]);

  if (status === "idle" || status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.loading}>Loading forecast...</span>
      </div>
    );
  }

  if (status === "error" || !timeseries) {
    return (
      <div className={styles.container}>
        <span className={styles.error}>Unable to load forecast</span>
      </div>
    );
  }

  const days = parseForecast(timeseries);

  return (
    <div className={styles.container}>
      {days.map((day) => (
        <div key={day.day} className={styles.dayCard}>
          <span className={styles.dayName}>{day.day}</span>
          <img
            className={styles.icon}
            src={`https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${day.symbolCode}.svg`}
            alt={day.symbolCode}
            width={36}
            height={36}
          />
          <span className={styles.temp}>{Math.round(day.temperature)}°C</span>
        </div>
      ))}
    </div>
  );
}
