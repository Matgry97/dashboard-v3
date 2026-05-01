import { registerWidget } from "../../registry/widget-registry";
import { LastWorkoutWidget } from "./LastWorkoutWidget";

registerWidget({
  id: "last-workout",
  name: "Last Workout",
  description: "Shows your most recent Garmin activity.",
  defaultSize: "medium",
  component: LastWorkoutWidget,
});
