import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { hydrateDocumentStore } from "./persist/initDocumentPersistence.js";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

void hydrateDocumentStore().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
