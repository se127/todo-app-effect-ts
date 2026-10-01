import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Direction } from "radix-ui"
import { App } from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/*
     * Radix popups read direction from context, not the `dir` attribute, so the
     * Select dropdown would align to the wrong side without this.
     */}
    <Direction.Provider dir="rtl">
      <App />
    </Direction.Provider>
  </StrictMode>,
)