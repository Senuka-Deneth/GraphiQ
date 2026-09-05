import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { hydrateDocumentStore } from "./persist/initDocumentPersistence.js";
import { useDocumentStore } from "./store/documentStore.js";
import "./index.css";

if (import.meta.env.DEV) {
  (
    window as Window & {
      __graphiqDocumentStore?: typeof useDocumentStore;
    }
  ).__graphiqDocumentStore = useDocumentStore;
}

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
