"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, RefreshCw, ShieldCheck, ScanLine } from "lucide-react";

type Role = "ADMIN" | "BARANGAY_ADMIN" | "USER" | "CONTENT_ADMIN" | "TREASURY_STAFF" | "ADMIN_AIDE" | "RIDER" | "ENGINEER" | null;

type RfidResident = {
  id: string;
  fullName: string;
  firstName: string;
  barangay?: string;
  role: Role;
};

type ActivationState = {
  userId: string;
  fullName: string;
  role: Exclude<Role, null>;
  activatedAt: string;
};

const STORAGE_KEY = "kiosk_device_admin_activation";
const ALLOWED_ROLES = new Set(["ADMIN", "BARANGAY_ADMIN"]);
const ACTIVATION_BYPASS_ENABLED =
  process.env.NEXT_PUBLIC_KIOSK_ACTIVATION_BYPASS?.toLowerCase() === "true";
const MANUAL_RFID_INPUT_ENABLED =
  process.env.NEXT_PUBLIC_KIOSK_RFID_MANUAL_INPUT?.toLowerCase() === "true";

export default function KioskActivationGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState<ActivationState | null>(null);
  const [listening, setListening] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCardId, setManualCardId] = useState("");
  const inputBuffer = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accentStyle = {
    backgroundColor: "var(--primary-theme)",
    borderColor: "color-mix(in srgb, var(--primary-theme) 35%, transparent)",
    boxShadow: "0 14px 30px color-mix(in srgb, var(--primary-theme) 28%, transparent)",
  } as const;
  const accentSoftStyle = {
    backgroundColor: "color-mix(in srgb, var(--primary-theme) 12%, transparent)",
    borderColor: "color-mix(in srgb, var(--primary-theme) 18%, transparent)",
  } as const;
  const accentTextStyle = {
    color: "var(--primary-theme-secondary)",
  } as const;

  const unlock = useCallback((activation: ActivationState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activation));
    setActivated(activation);
  }, []);

  const verifyAdminCard = useCallback(async (cardId: string) => {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfid?card=${encodeURIComponent(cardId)}`);
      const result = (await response.json()) as { resident?: RfidResident; error?: string };

      if (!response.ok || !result.resident) {
        throw new Error(result.error || "Card not recognized.");
      }

      if (!result.resident.role || !ALLOWED_ROLES.has(result.resident.role)) {
        throw new Error("Only ADMIN or BARANGAY_ADMIN cards can unlock the kiosk.");
      }

      unlock({
        userId: result.resident.id,
        fullName: result.resident.fullName,
        role: result.resident.role as Exclude<Role, null>,
        activatedAt: new Date().toISOString(),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify RFID card.");
    } finally {
      setChecking(false);
    }
  }, [unlock]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setActivated(JSON.parse(saved) as ActivationState);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activated) return;

    if (MANUAL_RFID_INPUT_ENABLED) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        const cardId = inputBuffer.current.trim();
        inputBuffer.current = "";

        if (cardId.length > 3) {
          void verifyAdminCard(cardId);
        }
        return;
      }

      if (event.key.length === 1) {
        setListening(true);
        inputBuffer.current += event.key;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          inputBuffer.current = "";
          setListening(false);
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activated, verifyAdminCard]);

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActivated(null);
    setError(null);
    inputBuffer.current = "";
    setListening(false);
    setManualCardId("");
  };

  if (loading) return null;
  if (ACTIVATION_BYPASS_ENABLED) return <>{children}</>;
  if (activated) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07130c] px-4 py-8 text-white">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={accentStyle}>
            <LockKeyhole className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em]" style={accentTextStyle}>
              Device Registration
            </p>
            <h1 className="text-2xl font-black uppercase italic tracking-tight sm:text-4xl">
              Kiosk Unregistered
            </h1>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-6 text-white/70 sm:text-base">
          {MANUAL_RFID_INPUT_ENABLED ? (
            <>
              Enter an RFID card ID for an <strong>ADMIN</strong> or{" "}
              <strong>BARANGAY_ADMIN</strong> account to unlock this kiosk on the current browser.
            </>
          ) : (
            <>
              Tap or scan an RFID card for an <strong>ADMIN</strong> or{" "}
              <strong>BARANGAY ADMIN</strong> account to unlock this kiosk on the current browser.
            </>
          )}
        </p>

        {MANUAL_RFID_INPUT_ENABLED ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const cardId = manualCardId.trim();
              if (cardId) void verifyAdminCard(cardId);
            }}
            className="mt-8 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.28em] text-white/50">
                RFID Card ID
              </label>
              <input
                value={manualCardId}
                onChange={(e) => setManualCardId(e.target.value)}
                placeholder="000123456789"
                className="w-full rounded-2xl border bg-black/20 px-4 py-4 text-lg font-semibold tracking-[0.14em] text-white outline-none ring-0 transition placeholder:text-white/25 focus:bg-black/30"
                style={{
                  borderColor: "color-mix(in srgb, var(--primary-theme) 18%, transparent)",
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="rounded-2xl border px-4 py-4 text-sm text-white/70" style={accentSoftStyle}>
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4" style={accentTextStyle} />
                Manual RFID input is enabled
              </div>
              <div className="mt-2 text-white/45">
                Only cards linked to allowed roles can activate the kiosk.
              </div>
            </div>

            <button
              type="submit"
              disabled={checking || !manualCardId.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={accentStyle}
            >
              <ShieldCheck className="h-4 w-4" />
              {checking ? "Verifying..." : "Verify RFID"}
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl border px-4 py-4 text-sm text-white/70" style={accentSoftStyle}>
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" style={accentTextStyle} />
              {listening ? "RFID input detected..." : "Waiting for RFID scan"}
            </div>
            <div className="mt-2 text-white/45">
              Only cards linked to allowed roles can activate the kiosk.
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Saved Access
          </button>

          <div
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white opacity-80"
            style={accentStyle}
          >
            <ShieldCheck className="h-4 w-4" />
            {checking ? "Verifying..." : "Admin RFID Required"}
          </div>
        </div>

      </div>
    </div>
  );
}
