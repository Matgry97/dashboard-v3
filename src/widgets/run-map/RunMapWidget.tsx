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
    map.fitBounds(polyline.getBounds(), { padding: [16, 16] });

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
      <div className={styles.overlay}>
        <span className={styles.name}>{run.name}</span>
        <span className={styles.dist}>{(run.distance / 1000).toFixed(2)} km</span>
      </div>
    </div>
  );
}
