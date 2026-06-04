import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStravaStore } from "../../store/strava-store";
import styles from "./RunMapWidget.module.css";

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(meters: number, seconds: number): string {
  const secPerKm = seconds / (meters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RunMapWidget(_props: { instanceId: string }) {
  const { run, status, fetchIfNeeded } = useStravaStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);

  useEffect(() => {
    if (!mapRef.current || !run?.map?.summary_polyline) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const coords = decodePolyline(run.map.summary_polyline);
    if (!coords.length) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const polyline = L.polyline(coords, {
      color: "#00e87a",
      weight: 3,
      opacity: 0.9,
    });
    polyline.addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [12, 12], maxZoom: 18 });
    setTimeout(() => map.invalidateSize(), 0);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [run]);

  if (status === "idle" || status === "loading") {
    return (
      <div className={styles.placeholder}>
        <span className={styles.label}>Loading route...</span>
      </div>
    );
  }

  if (status === "error" || !run?.map?.summary_polyline) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.label}>No route data</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={mapRef} className={styles.map} />
      <div className={styles.statsCard}>
        <div className={styles.heroStat}>
          <span className={styles.heroValue}>{(run.distance / 1000).toFixed(2)}</span>
          <span className={styles.heroUnit}>km</span>
        </div>
        <div className={styles.secondaryStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatDuration(run.moving_time)}</span>
            <span className={styles.statLabel}>Time</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {formatPace(run.distance, run.moving_time)}
              <span className={styles.statUnit}>/km</span>
            </span>
            <span className={styles.statLabel}>Pace</span>
          </div>
          {run.average_heartrate != null && (
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {Math.round(run.average_heartrate)}
                <span className={styles.statUnit}> bpm</span>
              </span>
              <span className={styles.statLabel}>HR</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
