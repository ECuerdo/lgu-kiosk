"use client";

import { useEffect } from "react";

function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, "");
  
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }
  
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  
  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");
  
  return `#${rHex}${gHex}${bHex}`;
}

export default function DynamicTheme() {
  useEffect(() => {
    async function loadTheme() {
      try {
        const response = await fetch(`/api/system-settings/theme_color?t=${Date.now()}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (result.success && result.value) {
          const baseHex = result.value;
          const { h, s, l } = hexToHsl(baseHex);
          
          const hoverHex = hslToHex(h, s, Math.max(0, l - 8));
          const darkHex = hslToHex(h, s, Math.max(0, l - 18));
          const lightHex = hslToHex(h, s, 95);
          const secondaryHex = hslToHex(h, Math.min(100, s + 5), Math.min(100, l + 12));
          
          const root = document.documentElement;
          root.style.setProperty("--primary-theme", baseHex);
          root.style.setProperty("--primary-theme-hover", hoverHex);
          root.style.setProperty("--primary-theme-dark", darkHex);
          root.style.setProperty("--primary-theme-light", lightHex);
          root.style.setProperty("--primary-theme-secondary", secondaryHex);
          
          // Overwrite Tailwind color primary, secondary & emerald palette
          root.style.setProperty("--color-primary", baseHex);
          root.style.setProperty("--color-secondary", secondaryHex);
          root.style.setProperty("--color-emerald-50", lightHex);
          root.style.setProperty("--color-emerald-100", lightHex);
          root.style.setProperty("--color-emerald-200", lightHex);
          root.style.setProperty("--color-emerald-300", lightHex);
          root.style.setProperty("--color-emerald-400", baseHex);
          root.style.setProperty("--color-emerald-500", baseHex);
          root.style.setProperty("--color-emerald-600", hoverHex);
          root.style.setProperty("--color-emerald-700", darkHex);
          root.style.setProperty("--color-emerald-800", darkHex);
          root.style.setProperty("--color-emerald-900", darkHex);
          root.style.setProperty("--color-emerald-950", darkHex);
        }
      } catch (e) {
        console.error("Failed to load dynamic theme setting:", e);
      }
    }
    
    void loadTheme();
  }, []);

  return null;
}
