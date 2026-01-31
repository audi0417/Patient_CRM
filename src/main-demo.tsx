import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import "./index.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import DemoExperience from "@/pages/DemoExperience";
import { HashRouter, Routes, Route } from "react-router-dom";

// Polyfills for browser compatibility (required by some libs)
window.Buffer = Buffer;
window.process = process;
globalThis.Buffer = Buffer;
globalThis.process = process;

if (!window.process.browser) {
  window.process.browser = true;
}
if (!globalThis.process.browser) {
  globalThis.process.browser = true;
}

// 設置 Demo 模式標記，確保在組件掛載前就生效
(window as any).__isDemoMode = true;

const DemoApp = () => (
  <HashRouter>
    <Routes>
      <Route path="*" element={
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DemoExperience />
        </TooltipProvider>
      } />
    </Routes>
  </HashRouter>
);

createRoot(document.getElementById("root")!).render(<DemoApp />);
