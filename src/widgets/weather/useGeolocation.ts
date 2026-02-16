import { useEffect, useState } from "react";

export interface GeoLocation {
  lat: number;
  lon: number;
}

type GeoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; location: GeoLocation };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation is not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setState({
            status: "success",
            location: {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            },
          });
        }
      },
      (err) => {
        if (!cancelled) {
          const messages: Record<number, string> = {
            1: "Location permission denied",
            2: "Location unavailable",
            3: "Location request timed out",
          };
          setState({
            status: "error",
            message: messages[err.code] ?? err.message,
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
