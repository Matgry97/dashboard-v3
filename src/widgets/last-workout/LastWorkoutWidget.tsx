import { useEffect } from "react";
import { useGarminStore } from "../../store/garmin-store";
import styles from "./LastWorkoutWidget.module.css";

function formatDuration(elapsed: string): string {
  // SQLite stores as HH:MM:SS — drop seconds for display
  const parts = elapsed.split(":");
  if (parts.length >= 2) return `${parts[0]}h ${parts[1]}m`;
  return elapsed;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

function formatSport(sport: string): string {
  return sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LastWorkoutWidget(_props: { instanceId: string }) {
  const { workout, status, syncStatus, error, syncError, fetch: fetchWorkout, sync } = useGarminStore();

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  if (status === "idle" || status === "loading") {
    return (
      <div className={styles.container}>
        <span className={styles.loading}>Loading workout...</span>
      </div>
    );
  }

  if (status === "error" || !workout) {
    return (
      <div className={styles.container}>
        <span className={styles.error}>{error ?? "Unable to load workout"}</span>
        <button className={styles.syncBtn} onClick={fetchWorkout}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.sport}>{formatSport(workout.sport)}</span>
        <span className={styles.date}>{formatDate(workout.start_time)}</span>
      </div>
      <span className={styles.name}>{workout.name}</span>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDistance(workout.distance)}</span>
          <span className={styles.statLabel}>Distance</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDuration(workout.elapsed_time)}</span>
          <span className={styles.statLabel}>Duration</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{workout.avg_hr} bpm</span>
          <span className={styles.statLabel}>Avg HR</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{workout.calories}</span>
          <span className={styles.statLabel}>Calories</span>
        </div>
      </div>
      {syncError && <span className={styles.error}>{syncError}</span>}
      <button
        className={styles.syncBtn}
        onClick={sync}
        disabled={syncStatus === "syncing"}
      >
        {syncStatus === "syncing" ? "Syncing..." : "Sync"}
      </button>
    </div>
  );
}
