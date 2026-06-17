"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";

const POLL_MS = 5000;

export default function KioskMaintenanceGuard() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastStateRef = useRef<boolean | null>(null);
  const reloadQueuedRef = useRef(false);

  const checkMaintenance = useCallback(async () => {
    try {
      const response = await fetch(`/api/system-settings/kiosk_maintenance_mode?t=${Date.now()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      const nextValue = String(result.value || "").toLowerCase() === "true";

      if (lastStateRef.current === true && nextValue === false && !reloadQueuedRef.current) {
        reloadQueuedRef.current = true;
        window.location.reload();
        return;
      }

      lastStateRef.current = nextValue;
      setIsMaintenance(nextValue);
      setLoading(false);
    } catch (error) {
      console.error("Maintenance mode check failed:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialCheckId = window.setTimeout(() => {
      void checkMaintenance();
    }, 0);
    const intervalId = window.setInterval(() => {
      void checkMaintenance();
    }, POLL_MS);

    const handleWake = () => {
      void checkMaintenance();
    };

    window.addEventListener("focus", handleWake);
    window.addEventListener("pageshow", handleWake);
    document.addEventListener("visibilitychange", handleWake);

    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWake);
      window.removeEventListener("pageshow", handleWake);
      document.removeEventListener("visibilitychange", handleWake);
    };
  }, [checkMaintenance]);

  if (loading) return null;

  return (
    <AnimatePresence>
      {isMaintenance && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[2.5rem] border border-[#1a6b3a]/25 bg-white p-8 text-center shadow-2xl dark:bg-[#0b0f0d]"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1a6b3a]/10 text-[#1a6b3a]">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#1a6b3a]">
              Kiosk Maintenance Mode
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Temporarily Unavailable
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              The kiosk is currently under maintenance. Please wait while the system is being updated.
              This screen cannot be dismissed until maintenance mode is turned off.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
