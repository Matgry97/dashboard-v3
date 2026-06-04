export interface WidgetInstance {
  id: string;
  widgetId: string;
  config?: Record<string, unknown>;
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: WidgetInstance[];
}
