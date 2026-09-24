import type { NewsSection } from "../../types/news";
import { relativeTime } from "../../utils/date";
import styles from "./NewsTab.module.css";

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  section: NewsSection;
  /** Stack sections are compact release-note cards with a NEW marker. */
  compact?: boolean;
  /** Reference time for relative dates, ticked by the parent. */
  now: number;
}

export function NewsSourceSection({ section, compact = false, now }: Props) {
  const { source, items, error, stale, fetchedAt } = section;

  return (
    <section className={styles.card} data-testid={`news-section-${source.id}`}>
      <header className={styles.cardHeader}>
        <a className={styles.cardTitle} href={source.homepage} target="_blank" rel="noopener noreferrer">
          {source.name}
        </a>
        {stale && !error && (
          <span className={styles.staleTag} title={`${source.name} is failing — showing last saved items`}>
            as of {relativeTime(fetchedAt, now)} ago
          </span>
        )}
      </header>

      {error ? (
        <div className={styles.sectionError}>
          Couldn't load {source.name}.{" "}
          <a href={source.homepage} target="_blank" rel="noopener noreferrer">
            Open site ↗
          </a>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.sectionEmpty}>No items</div>
      ) : (
        <ol className={styles.items}>
          {items.map((item) => {
            const isNew =
              compact && item.publishedAt && now - new Date(item.publishedAt).getTime() < NEW_WINDOW_MS;
            return (
              <li key={item.id} className={styles.item}>
                <a className={styles.itemTitle} href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                <div className={styles.itemMeta}>
                  {isNew && <span className={styles.newBadge}>New</span>}
                  {item.tags?.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                  {item.score !== undefined && <span>{item.score} pts</span>}
                  {item.commentsUrl && (
                    <a href={item.commentsUrl} target="_blank" rel="noopener noreferrer">
                      comments
                    </a>
                  )}
                  {item.publishedAt && <span>{relativeTime(item.publishedAt, now)}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
