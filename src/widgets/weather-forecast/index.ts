import { registerWidget } from "../../registry/widget-registry";
import { WeatherForecast } from "./WeatherForecast";

registerWidget({
  id: "weather-forecast",
  name: "3-Day Forecast",
  description: "Shows the weather forecast for the next 3 days.",
  defaultSize: "medium",
  component: WeatherForecast,
});
