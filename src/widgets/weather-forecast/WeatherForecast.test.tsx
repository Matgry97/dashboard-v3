// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WeatherForecast } from "./WeatherForecast";

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

function makeTimeseries(daysFromNow: number, hour: number, temp: number, symbolCode: string) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);

  return {
    time: date.toISOString(),
    data: {
      instant: {
        details: {
          air_temperature: temp,
          wind_speed: 2,
          relative_humidity: 50,
        },
      },
      next_6_hours: {
        summary: { symbol_code: symbolCode },
      },
    },
  };
}

const MOCK_TIMESERIES = [
  makeTimeseries(0, 12, 5, "clearsky_day"),
  makeTimeseries(1, 6, 3, "rain"),
  makeTimeseries(1, 12, 8, "partlycloudy_day"),
  makeTimeseries(1, 18, 6, "cloudy"),
  makeTimeseries(2, 6, 1, "fog"),
  makeTimeseries(2, 12, 10, "fair_day"),
  makeTimeseries(2, 18, 7, "cloudy"),
  makeTimeseries(3, 6, 0, "snow"),
  makeTimeseries(3, 12, 4, "clearsky_day"),
  makeTimeseries(3, 18, 2, "clearsky_night"),
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

describe("WeatherForecast", () => {
  it("renders 3 days with noon temperatures and icons", async () => {
    setStore({ timeseries: MOCK_TIMESERIES, status: "success" });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherForecast, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("8°C");
    expect(container.textContent).toContain("10°C");
    expect(container.textContent).toContain("4°C");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(3);
    expect(imgs[0].alt).toBe("partlycloudy_day");
    expect(imgs[1].alt).toBe("fair_day");
    expect(imgs[2].alt).toBe("clearsky_day");
  });

  it("shows loading state", () => {
    setStore({ timeseries: null, status: "loading" });

    act(() => {
      createRoot(container).render(
        createElement(WeatherForecast, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Loading forecast...");
  });

  it("shows error state", async () => {
    setStore({ timeseries: null, status: "error" });

    await act(async () => {
      createRoot(container).render(
        createElement(WeatherForecast, { instanceId: "test-1" })
      );
    });

    expect(container.textContent).toContain("Unable to load forecast");
  });

  it("calls fetchIfNeeded on mount", () => {
    const fetchIfNeeded = vi.fn();
    setStore({ timeseries: null, status: "loading", fetchIfNeeded });

    act(() => {
      createRoot(container).render(
        createElement(WeatherForecast, { instanceId: "test-1" })
      );
    });

    expect(fetchIfNeeded).toHaveBeenCalled();
  });
});
