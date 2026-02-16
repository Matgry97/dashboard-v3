import { useEffect, useState } from "react";
import styles from "./WeatherWidget.module.css";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  symbolCode: string;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: WeatherData };

function formatSymbolCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WeatherWidget(_props: { instanceId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    function fetchWeather(lat: number, lon: number) {
      fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
        { headers: { "User-Agent": "dashboard-v3/1.0" } }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (cancelled) return;
          const entry = json.properties.timeseries[0];
          const details = entry.data.instant.details;
          const symbolCode =
            entry.data.next_1_hours?.summary?.symbol_code ??
            entry.data.next_6_hours?.summary?.symbol_code ??
            "cloudy";
          setState({
            status: "success",
            data: {
              temperature: details.air_temperature,
              windSpeed: details.wind_speed,
              humidity: details.relative_humidity,
              symbolCode,
            },
          });
        })
        .catch((err) => {
          if (!cancelled) {
            setState({ status: "error", message: err.message });
          }
        });
    }

    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation is not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        if (!cancelled) {
          setState({ status: "error", message: err.message });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.loading}>Loading weather...</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={styles.container}>
        <span className={styles.error}>{state.message}</span>
      </div>
    );
  }

  const { data } = state;
  const iconUrl = `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${data.symbolCode}.svg`;

  return (
    <div className={styles.container}>
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
