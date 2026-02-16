import { useEffect, useState } from "react";
import styles from "./WeatherWidget.module.css";
import { useGeolocation, type GeoLocation } from "./useGeolocation";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  symbolCode: string;
}

type WeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: WeatherData };

function formatSymbolCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function useWeather(location: GeoLocation | null): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "idle" });

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setState({ status: "loading" });

    fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location.lat.toFixed(4)}&lon=${location.lon.toFixed(4)}`,
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

    return () => {
      cancelled = true;
    };
  }, [location]);

  return state;
}

export function WeatherWidget(_props: { instanceId: string }) {
  const geo = useGeolocation();
  const location = geo.status === "success" ? geo.location : null;
  const weather = useWeather(location);

  if (geo.status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.loading}>Acquiring location...</span>
      </div>
    );
  }

  if (geo.status === "error") {
    return (
      <div className={styles.container}>
        <span className={styles.error}>{geo.message}</span>
      </div>
    );
  }

  const { lat, lon } = geo.location;
  const coordsLabel = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  if (weather.status === "idle" || weather.status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.location}>{coordsLabel}</span>
        <span className={styles.loading}>Loading weather...</span>
      </div>
    );
  }

  if (weather.status === "error") {
    return (
      <div className={styles.container}>
        <span className={styles.location}>{coordsLabel}</span>
        <span className={styles.error}>Unable to fetch weather</span>
      </div>
    );
  }

  const { data } = weather;
  const iconUrl = `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${data.symbolCode}.svg`;

  return (
    <div className={styles.container}>
      <span className={styles.location}>{coordsLabel}</span>
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
