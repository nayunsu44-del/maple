import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App_v2.tsx";

// roundRect polyfill for iOS 15 and below / legacy browsers
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: any) {
    if (typeof r === "undefined") r = 0;
    if (typeof r === "number") {
      r = { tl: r, tr: r, br: r, bl: r };
    } else if (Array.isArray(r)) {
      if (r.length === 1) r = { tl: r[0], tr: r[0], br: r[0], bl: r[0] };
      else if (r.length === 2) r = { tl: r[0], tr: r[1], br: r[0], bl: r[1] };
      else if (r.length === 3) r = { tl: r[0], tr: r[1], br: r[2], bl: r[1] };
      else if (r.length >= 4) r = { tl: r[0], tr: r[1], br: r[2], bl: r[3] };
    }
    const radii = { tl: 0, tr: 0, br: 0, bl: 0, ...r };
    const maxRadius = Math.min(w / 2, h / 2);
    const tl = Math.min(radii.tl, maxRadius);
    const tr = Math.min(radii.tr, maxRadius);
    const br = Math.min(radii.br, maxRadius);
    const bl = Math.min(radii.bl, maxRadius);

    this.beginPath();
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br, br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
    return this;
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
