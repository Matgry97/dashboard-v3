import type { DragEvent, ReactNode } from "react";
import styles from "./WidgetShell.module.css";

interface WidgetShellProps {
  title: string;
  onRemove: () => void;
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
  onRemove,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: WidgetShellProps) {
  const classes = [
    styles.shell,
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
          <button className={styles.removeBtn} onClick={onRemove} title="Remove widget">
            ×
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
