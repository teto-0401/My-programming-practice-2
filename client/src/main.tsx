import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const colorMode = (import.meta.env as Record<string, string | undefined>).COLOR
  ?.trim()
  .toUpperCase();

if (colorMode === "WHITE") {
  document.documentElement.classList.add("theme-white");
}

createRoot(document.getElementById("root")!).render(<App />);
