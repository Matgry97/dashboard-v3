import type { ReactNode } from "react";
import type { WidgetSize } from "../../types/widget";
import styles from "./WidgetShell.module.css";

interface WidgetShellProps {
  title: string;
  size: WidgetSize;
  onRemove: () => void;
  children: ReactNode;
}

export function WidgetShell({ title, size, onRemove, children }: WidgetShellProps) {
  return (
    <div className={`${styles.shell} ${styles[size]}`}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <button className={styles.removeBtn} onClick={onRemove} title="Remove widget">
          ×
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
