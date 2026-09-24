import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts: no Google dependency, works offline on the Pi
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/figtree";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
