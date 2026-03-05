// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWeatherStore } from "./weather-store";

const MOCK_API_RESPONSE = {
  properties: {
    timeseries: [
      {
        time: "2026-03-05T12:00:00Z",
        data: {
          instant: {
            details: { air_temperature: 5, wind_speed: 3, relative_humidity: 70 },
          },
          next_1_hours: { summary: { symbol_code: "clearsky_day" } },
        },
      },
    ],
  },
};

beforeEach(() => {
  useWeatherStore.setState({
    timeseries: null,
    fetchedDate: null,
    status: "idle",
    error: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("weather-store", () => {
  it("fetches data and stores timeseries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    } as Response);

    useWeatherStore.getState().fetchIfNeeded();

    expect(useWeatherStore.getState().status).toBe("loading");

    // Wait for fetch to resolve
    await vi.waitFor(() => {
      expect(useWeatherStore.getState().status).toBe("success");
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(useWeatherStore.getState().timeseries).toEqual(
      MOCK_API_RESPONSE.properties.timeseries
    );
    expect(useWeatherStore.getState().fetchedDate).toBeTruthy();
    expect(useWeatherStore.getState().error).toBeNull();
  });

  it("skips fetch when data is from today", async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    useWeatherStore.setState({
      timeseries: MOCK_API_RESPONSE.properties.timeseries,
      fetchedDate: todayStr,
      status: "success",
      error: null,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    useWeatherStore.getState().fetchIfNeeded();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useWeatherStore.getState().status).toBe("success");
  });

  it("re-fetches when data is from a previous day", async () => {
    useWeatherStore.setState({
      timeseries: MOCK_API_RESPONSE.properties.timeseries,
      fetchedDate: "2020-01-01",
      status: "success",
      error: null,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    } as Response);

    useWeatherStore.getState().fetchIfNeeded();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(useWeatherStore.getState().status).toBe("loading");
  });

  it("does not double-fetch when already loading", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    useWeatherStore.getState().fetchIfNeeded();
    useWeatherStore.getState().fetchIfNeeded();

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("sets error state on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network failure"));

    useWeatherStore.getState().fetchIfNeeded();

    await vi.waitFor(() => {
      expect(useWeatherStore.getState().status).toBe("error");
    });

    expect(useWeatherStore.getState().error).toBe("Network failure");
  });

  it("sets error state on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    useWeatherStore.getState().fetchIfNeeded();

    await vi.waitFor(() => {
      expect(useWeatherStore.getState().status).toBe("error");
    });

    expect(useWeatherStore.getState().error).toBe("API error: 429");
  });
});
