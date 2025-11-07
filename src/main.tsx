import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import App from "./App.tsx";
import "./index.css";

// Polyfills for browser compatibility
window.Buffer = Buffer;
window.process = process;
globalThis.Buffer = Buffer;
globalThis.process = process;

// Set process.browser flag for compatibility
if (!window.process.browser) {
  window.process.browser = true;
}
if (!globalThis.process.browser) {
  globalThis.process.browser = true;
}

createRoot(document.getElementById("root")!).render(<App />);
