import type { DragEvent, ReactNode } from "react";
import type { WidgetSize } from "../../types/widget";
import styles from "./WidgetShell.module.css";

const SIZES: WidgetSize[] = ["small", "medium", "large"];
const SIZE_LABELS: Record<WidgetSize, string> = { small: "S", medium: "M", large: "L" };

interface WidgetShellProps {
  title: string;
  size: WidgetSize;
  onRemove: () => void;
  onResize: (size: WidgetSize) => void;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export function WidgetShell({
  title,
  size,
  onRemove,
  onResize,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: WidgetShellProps) {
  function cycleSize() {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
    onResize(next);
  }

  const classes = [
    styles.shell,
    styles[size],
    isDragging ? styles.dragging : '',
    isDragOver ? styles.dragOver : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={styles.header}>
<span className={styles.title}>{title}</span>
        <div className={styles.actions}>
          <div className={styles.sizePill}>
            {SIZES.map((s) => (
              <button
                key={s}
                className={`${styles.sizeOption} ${size === s ? styles.sizeActive : ''}`}
                onClick={() => onResize(s)}
                title={s}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>
          <button className={styles.removeBtn} onClick={onRemove} title="Remove widget">
            ×
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
