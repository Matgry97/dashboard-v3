import { registerWidget } from "../../registry/widget-registry";
import { LastWorkoutWidget } from "./LastWorkoutWidget";

registerWidget({
  id: "last-workout",
  name: "Last Workout",
  description: "Shows your last run from Strava.",
  component: LastWorkoutWidget,
});
