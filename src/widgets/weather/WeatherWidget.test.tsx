// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WeatherWidget } from "./WeatherWidget";

vi.mock("../../store/weather-store", () => {
  const store = { current: {} as any };
  return {
    useWeatherStore: () => store.current,
    __mockStore: store,
  };
});

const { __mockStore } = await import("../../store/weather-store") as any;

function setStore(partial: any) {
  __mockStore.current = { fetchIfNeeded: vi.fn(), ...partial };
}

const MOCK_TIMESERIES = [
  {
    time: "2026-02-12T12:00:00Z",
    data: {
      instant: {
        details: {
          air_temperature: 5.2,
          wind_speed: 3.1,
          relative_humidity: 72.4,
        },
      },
      next_1_hours: {
        summary: { symbol_code: "clearsky_day" },
      },
    },
  },
];

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

describe("WeatherWidget", () => {
  it("calls fetchIfNeeded on mount", () => {
    const fetchIfNeeded = vi.fn();
    setStore({ timeseries: null, status: "loading", fetchIfNeeded });

    act(() => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(fetchIfNeeded).toHaveBeenCalled();
  });

  it("renders weather data from store timeseries", async () => {
    setStore({ timeseries: MOCK_TIMESERIES, status: "success" });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Stavanger");
    expect(container.textContent).toContain("5°C");
    expect(container.textContent).toContain("Clearsky Day");
    expect(container.textContent).toContain("Wind 3.1 m/s");
    expect(container.textContent).toContain("Humidity 72%");

    const img = container.querySelector("img");
    expect(img?.src).toBe(
      "https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/clearsky_day.svg"
    );
    expect(img?.alt).toBe("clearsky_day");
  });

  it("falls back to next_6_hours symbol code when next_1_hours is absent", async () => {
    setStore({
      timeseries: [
        {
          time: "2026-02-12T12:00:00Z",
          data: {
            instant: {
              details: { air_temperature: 10, wind_speed: 2, relative_humidity: 50 },
            },
            next_6_hours: {
              summary: { symbol_code: "rain" },
            },
          },
        },
      ],
      status: "success",
    });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Rain");
  });

  it("falls back to 'cloudy' when no symbol code is available", async () => {
    setStore({
      timeseries: [
        {
          time: "2026-02-12T12:00:00Z",
          data: {
            instant: {
              details: { air_temperature: 0, wind_speed: 0, relative_humidity: 0 },
            },
          },
        },
      ],
      status: "success",
    });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Cloudy");
  });

  it("shows loading state", () => {
    setStore({ timeseries: null, status: "loading" });

    act(() => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Stavanger");
    expect(container.textContent).toContain("Loading weather...");
  });

  it("shows error state", async () => {
    setStore({ timeseries: null, status: "error", error: "API error: 429" });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherWidget, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Unable to fetch weather");
  });
});
