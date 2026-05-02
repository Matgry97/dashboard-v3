import { useEffect } from "react";
import { useStravaStore } from "../../store/strava-store";
import styles from "./LastWorkoutWidget.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
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

export function LastWorkoutWidget(_props: { instanceId: string }) {
  const { run, status, syncStatus, error, syncError, fetchIfNeeded, sync } = useStravaStore();

  useEffect(() => {
    fetchIfNeeded();
  }, [fetchIfNeeded]);

  if (status === "idle" || status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.loading}>Loading run...</span>
      </div>
    );
  }

  if (status === "error" || !run) {
    return (
      <div className={styles.container}>
        <span className={styles.error}>{error ?? "Unable to load run"}</span>
        <button className={styles.syncBtn} onClick={fetchIfNeeded}>Retry</button>
      </div>
    );
  }

  const distKm = (run.distance / 1000).toFixed(2);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.sportBadge}>Run</span>
        <span className={styles.date}>{formatDate(run.start_date)}</span>
      </div>

      <span className={styles.name}>{run.name}</span>

      <div className={styles.hero}>
        <span className={styles.heroValue}>{distKm}</span>
        <span className={styles.heroUnit}>km</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDuration(run.moving_time)}</span>
          <span className={styles.statLabel}>Time</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatPace(run.distance, run.moving_time)}<span className={styles.statLabel}> /km</span></span>
          <span className={styles.statLabel}>Pace</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{Math.round(run.total_elevation_gain)} m</span>
          <span className={styles.statLabel}>Elev</span>
        </div>
        {run.average_heartrate != null && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{Math.round(run.average_heartrate)}<span className={styles.statLabel}> bpm</span></span>
            <span className={styles.statLabel}>Avg HR</span>
          </div>
        )}
        {run.max_heartrate != null && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{run.max_heartrate}<span className={styles.statLabel}> bpm</span></span>
            <span className={styles.statLabel}>Max HR</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {syncStatus === "error" && syncError
          ? <span className={styles.syncError}>{syncError}</span>
          : <span />
        }
        <button
          className={styles.syncBtn}
          onClick={sync}
          disabled={syncStatus === "syncing"}
        >
          {syncStatus === "syncing" ? "Syncing..." : "Sync"}
        </button>
      </div>
    </div>
  );
}
