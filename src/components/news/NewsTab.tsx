import { useEffect, useState } from "react";
import { useNewsStore, NEWS_TTL_MS } from "../../store/news-store";
import type { NewsCategory } from "../../types/news";
import { NewsSourceSection } from "./NewsSourceSection";
import styles from "./NewsTab.module.css";

const CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "tech", label: "Tech" },
];

function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

export function NewsTab() {
  const category = useNewsStore((s) => s.category);
  const data = useNewsStore((s) => s.data[category]);
  const fetchedAt = useNewsStore((s) => s.fetchedAt[category]);
  const status = useNewsStore((s) => s.status[category] ?? "idle");
  const error = useNewsStore((s) => s.error[category]);
  const setCategory = useNewsStore((s) => s.setCategory);
  const fetchIfNeeded = useNewsStore((s) => s.fetchIfNeeded);
  const refresh = useNewsStore((s) => s.refresh);
  const [now, setNow] = useState(() => Date.now());

  // Tick relative timestamps ("12 m") once a minute
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchIfNeeded(category);
    // Keep an always-on screen fresh
    const timer = setInterval(() => fetchIfNeeded(category), NEWS_TTL_MS);
    return () => clearInterval(timer);
  }, [category, fetchIfNeeded]);

  const stack = data?.sections.filter((s) => s.source.group === "stack") ?? [];
  const headlines = data?.sections.filter((s) => s.source.group === "headlines") ?? [];
  const loading = status === "loading";

  return (
    <div className={styles.newsTab}>
      <div className={styles.toolbar}>
        <div className={styles.switch} role="radiogroup" aria-label="News category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={category === c.id}
              className={`${styles.switchOption} ${category === c.id ? styles.switchActive : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          {fetchedAt && <span className={styles.updated}>Updated {formatClock(fetchedAt)}</span>}
          <button
            className={`${styles.refreshBtn} ${loading ? styles.spinning : ""}`}
            onClick={() => refresh(category)}
            disabled={loading}
            aria-label="Refresh news"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {!data && loading && (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${styles.card} ${styles.skeleton}`} />
          ))}
        </div>
      )}

      {!data && status === "error" && (
        <div className={styles.fullError}>
          <span>{error || "Unable to load news"}</span>
          <button className={styles.retryBtn} onClick={() => refresh(category)}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {status === "error" && (
            <div className={styles.staleNotice}>
              Showing saved news — refresh failed{error ? `: ${error}` : ""}.
            </div>
          )}
          {stack.length > 0 && (
            <>
              <h2 className={styles.groupTitle}>Your stack</h2>
              <div className={styles.grid}>
                {stack.map((s) => (
                  <NewsSourceSection key={s.source.id} section={s} compact now={now} />
                ))}
              </div>
            </>
          )}
          {headlines.length > 0 && (
            <>
              {stack.length > 0 && <h2 className={styles.groupTitle}>Headlines</h2>}
              <div className={styles.grid}>
                {headlines.map((s) => (
                  <NewsSourceSection key={s.source.id} section={s} now={now} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
