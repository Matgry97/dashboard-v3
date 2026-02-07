import type { WidgetSize } from "./widget";

export interface WidgetInstance {
  id: string;
  widgetId: string;
  size: WidgetSize;
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: WidgetInstance[];
}
