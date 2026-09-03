"use client";

import { useEffect } from "react";

const CACHE_KEY = "kiosk_theme_cache";  // Must match the key in layout.tsx inline script
const CACHE_TTL = 10 * 60 * 1000;       // 10 minutes

function hexToHsl(hex: string) {
    hex = hex.replace(/^#/, "");

    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
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

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
    const gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
    const bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");

    return `#${rHex}${gHex}${bHex}`;
}

function buildThemeVars(baseHex: string): Record<string, string> {
    const { h, s, l } = hexToHsl(baseHex);
    const hoverHex     = hslToHex(h, s, Math.max(0, l - 8));
    const darkHex      = hslToHex(h, s, Math.max(0, l - 18));
    const lightHex     = hslToHex(h, s, 95);
    const secondaryHex = hslToHex(h, Math.min(100, s + 5), Math.min(100, l + 12));

    return {
        "--primary-theme":           baseHex,
        "--primary-theme-hover":     hoverHex,
        "--primary-theme-dark":      darkHex,
        "--primary-theme-light":     lightHex,
        "--primary-theme-secondary": secondaryHex,
        "--color-primary":           baseHex,
        "--color-secondary":         secondaryHex,
        "--color-emerald-50":        lightHex,
        "--color-emerald-100":       lightHex,
        "--color-emerald-200":       lightHex,
        "--color-emerald-300":       lightHex,
        "--color-emerald-400":       baseHex,
        "--color-emerald-500":       baseHex,
        "--color-emerald-600":       hoverHex,
        "--color-emerald-700":       darkHex,
        "--color-emerald-800":       darkHex,
        "--color-emerald-900":       darkHex,
        "--color-emerald-950":       darkHex,
    };
}

function applyThemeVars(vars: Record<string, string>) {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
}

export default function DynamicTheme() {
    useEffect(() => {
        // ── Step 1: Check if cache is still fresh (layout.tsx already applied it) ──
        // The inline <script> in layout.tsx already applied vars from localStorage
        // synchronously before first paint. We just need to decide if we re-fetch.
        let needsFetch = true;
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // New format: { vars: {...}, ts: number }
                if (parsed.vars && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) {
                    needsFetch = false;
                }
                // Legacy format (just vars object, no ts) — always refetch to upgrade
            }
        } catch {
            // continue to fetch
        }

        if (!needsFetch) return;

        // ── Step 2: Fetch fresh color, apply & save full var map ──────────────────
        async function loadTheme() {
            try {
                const response = await fetch("/api/system-settings/theme_color", {
                    cache: "no-store",
                });
                const result = await response.json();
                if (result.success && result.value) {
                    const baseHex: string = result.value;
                    const vars = buildThemeVars(baseHex);

                    // Apply immediately to DOM
                    applyThemeVars(vars);

                    // Save full var map with timestamp — layout.tsx reads this on next load
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify({ vars, ts: Date.now() }));
                    } catch {
                        // ignore storage write errors
                    }
                }
            } catch (e) {
                console.error("Failed to load dynamic theme setting:", e);
            }
        }

        void loadTheme();
    }, []);

    return null;
}
