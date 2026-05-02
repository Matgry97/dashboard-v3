import type { ComponentType } from "react";

export type WidgetSize = "small" | "medium" | "large";

export interface WidgetComponentProps {
  instanceId: string;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  defaultSize: WidgetSize;
  fixedSize?: boolean;
  component: ComponentType<WidgetComponentProps>;
}
