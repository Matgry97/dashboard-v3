import { registerWidget } from "../../registry/widget-registry";
import { WeatherWidget } from "./WeatherWidget";

registerWidget({
  id: "weather",
  name: "Today's Weather",
  description: "Shows today's weather for your location.",
  defaultSize: "small",
  component: WeatherWidget,
});
