// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WeatherWidget } from "./WeatherWidget";

const MOCK_API_RESPONSE = {
  properties: {
    timeseries: [
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
    ],
  },
};

function mockGeolocation(
  behavior: "success" | "denied" | "unavailable"
) {
  const getCurrentPosition = vi.fn(
    (
      success: PositionCallback,
      error: PositionErrorCallback
    ) => {
      if (behavior === "success") {
        success({
          coords: { latitude: 59.9139, longitude: 10.7522 },
        } as GeolocationPosition);
      } else {
        error({
          code: behavior === "denied" ? 1 : 2,
          message:
            behavior === "denied"
              ? "User denied Geolocation"
              : "Position unavailable",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      }
    }
  );

  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    writable: true,
    configurable: true,
  });

  return getCurrentPosition;
}

function removeGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

function renderWidget() {
  act(() => {
    createRoot(container).render(
      createElement(WeatherWidget, { instanceId: "test-1" })
    );
  });
}

describe("WeatherWidget", () => {
  describe("successful fetch", () => {
    it("calls the MET API with correct lat/lon and renders weather data", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_API_RESPONSE),
      } as Response);

      mockGeolocation("success");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      // Verify fetch was called with the right URL and User-Agent
      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(
        "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.9139&lon=10.7522"
      );
      expect((options as RequestInit).headers).toEqual({
        "User-Agent": "dashboard-v3/1.0",
      });

      // Verify rendered output
      expect(container.textContent).toContain("5°C");
      expect(container.textContent).toContain("Clearsky Day");
      expect(container.textContent).toContain("Wind 3.1 m/s");
      expect(container.textContent).toContain("Humidity 72%");

      // Verify icon src
      const img = container.querySelector("img");
      expect(img?.src).toBe(
        "https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/clearsky_day.svg"
      );
      expect(img?.alt).toBe("clearsky_day");
    });

    it("falls back to next_6_hours symbol code when next_1_hours is absent", async () => {
      const responseWithout1h = {
        properties: {
          timeseries: [
            {
              time: "2026-02-12T12:00:00Z",
              data: {
                instant: {
                  details: {
                    air_temperature: 10,
                    wind_speed: 2,
                    relative_humidity: 50,
                  },
                },
                next_6_hours: {
                  summary: { symbol_code: "rain" },
                },
              },
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseWithout1h),
      } as Response);

      mockGeolocation("success");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("Rain");
    });

    it("falls back to 'cloudy' when no symbol code is available", async () => {
      const responseNoSymbol = {
        properties: {
          timeseries: [
            {
              time: "2026-02-12T12:00:00Z",
              data: {
                instant: {
                  details: {
                    air_temperature: 0,
                    wind_speed: 0,
                    relative_humidity: 0,
                  },
                },
              },
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseNoSymbol),
      } as Response);

      mockGeolocation("success");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("Cloudy");
    });
  });

  describe("API error handling", () => {
    it("displays error when API returns non-OK status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      mockGeolocation("success");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("API error: 429");
    });

    it("displays error when fetch rejects", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network failure")
      );

      mockGeolocation("success");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("Network failure");
    });
  });

  describe("geolocation errors", () => {
    it("displays error when geolocation is denied", async () => {
      mockGeolocation("denied");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("User denied Geolocation");
    });

    it("displays error when geolocation is unavailable", async () => {
      mockGeolocation("unavailable");

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("Position unavailable");
    });

    it("displays error when geolocation API is not supported", async () => {
      removeGeolocation();

      await act(async () => {
        createRoot(container).render(
          createElement(WeatherWidget, { instanceId: "test-1" })
        );
      });

      expect(container.textContent).toContain("Geolocation is not supported");
    });
  });

  describe("loading state", () => {
    it("shows loading text initially", () => {
      // Don't resolve geolocation — leave it pending
      Object.defineProperty(navigator, "geolocation", {
        value: { getCurrentPosition: vi.fn() },
        writable: true,
        configurable: true,
      });

      renderWidget();

      expect(container.textContent).toContain("Loading weather...");
    });
  });
});
