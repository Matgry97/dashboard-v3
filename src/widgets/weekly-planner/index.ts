import { registerWidget } from "../../registry/widget-registry";
import { WeeklyPlannerWidget } from "./WeeklyPlannerWidget";

registerWidget({
  id: "weekly-planner",
  name: "Weekly Planner",
  description: "A weekly overview with one column per day, Monday to Sunday.",
  defaultSize: "large",
  component: WeeklyPlannerWidget,
});
