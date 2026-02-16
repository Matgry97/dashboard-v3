import { registerWidget } from "../../registry/widget-registry";
import { WeatherWidget } from "./WeatherWidget";

registerWidget({
  id: "weather",
  name: "Weather",
  description: "Shows current weather for your location.",
  defaultSize: "small",
  component: WeatherWidget,
});
