import { useEffect } from "react";
import { useWeatherStore } from "../../store/weather-store";
import styles from "./WeatherWidget.module.css";

const LOCATION_NAME = "Stavanger";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  symbolCode: string;
}

function formatSymbolCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveCurrentWeather(entry: any): WeatherData {
  const details = entry.data.instant.details;
  const symbolCode =
    entry.data.next_1_hours?.summary?.symbol_code ??
    entry.data.next_6_hours?.summary?.symbol_code ??
    "cloudy";
  return {
    temperature: details.air_temperature,
    windSpeed: details.wind_speed,
    humidity: details.relative_humidity,
    symbolCode,
  };
}

export function WeatherWidget(_props: { instanceId: string }) {
  const { timeseries, status, fetchIfNeeded } = useWeatherStore();

  useEffect(() => {
    fetchIfNeeded();
  }, [fetchIfNeeded]);

  if (status === "idle" || status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.location}>{LOCATION_NAME}</span>
        <span className={styles.loading}>Loading weather...</span>
      </div>
    );
  }

  if (status === "error" || !timeseries) {
    return (
      <div className={styles.container}>
        <span className={styles.location}>{LOCATION_NAME}</span>
        <span className={styles.error}>Unable to fetch weather</span>
      </div>
    );
  }

  const data = deriveCurrentWeather(timeseries[0]);
  const iconUrl = `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${data.symbolCode}.svg`;

  return (
    <div className={styles.container}>
      <span className={styles.location}>{LOCATION_NAME}</span>
      <img
        className={styles.icon}
        src={iconUrl}
        alt={data.symbolCode}
        width={48}
        height={48}
      />
      <span className={styles.temp}>{Math.round(data.temperature)}°C</span>
      <span className={styles.condition}>
        {formatSymbolCode(data.symbolCode)}
      </span>
      <div className={styles.details}>
        <span>Wind {data.windSpeed} m/s</span>
        <span>Humidity {Math.round(data.humidity)}%</span>
      </div>
    </div>
  );
}
