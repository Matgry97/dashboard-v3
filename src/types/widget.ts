import type { ComponentType } from "react";

export interface WidgetComponentProps {
  instanceId: string;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  component: ComponentType<WidgetComponentProps>;
}
