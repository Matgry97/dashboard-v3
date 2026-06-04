import { registerWidget } from "../../registry/widget-registry";
import { ClockWidget } from "./ClockWidget";

registerWidget({
  id: "clock",
  name: "Clock",
  description: "Displays the current time and date.",
  component: ClockWidget,
});
