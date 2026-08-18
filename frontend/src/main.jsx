import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import "./index.css";


// ============================================================
// ROOT ELEMENT
// ============================================================

const rootElement = document.getElementById("root");


// ============================================================
// SAFETY CHECK
// ============================================================

if (!rootElement) {
  throw new Error(
    'Root element "#root" was not found in index.html.'
  );
}


// ============================================================
// APPLICATION
// ============================================================

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);