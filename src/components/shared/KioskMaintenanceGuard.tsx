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
            className="w-full max-w-2xl rounded-[3rem] border border-[#1a6b3a]/25 bg-white p-10 text-center shadow-2xl dark:bg-[#0b0f0d] sm:p-12"
          >
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#1a6b3a]/10 text-[#1a6b3a] sm:h-24 sm:w-24">
              <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <p className="text-[12px] font-black uppercase tracking-[0.45em] text-[#1a6b3a] sm:text-sm">
              Kiosk Maintenance Mode
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white sm:text-6xl">
              Temporarily Unavailable
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-2xl sm:leading-relaxed">
              The kiosk is currently under maintenance. Please wait while the system is being updated.
              This screen cannot be dismissed until maintenance mode is turned off.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
