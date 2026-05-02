import { registerWidget } from "../../registry/widget-registry";
import { RunMapWidget } from "./RunMapWidget";

registerWidget({
  id: "run-map",
  name: "Run Map",
  description: "Shows the route of your last Strava run.",
  defaultSize: "medium",
  component: RunMapWidget,
});
