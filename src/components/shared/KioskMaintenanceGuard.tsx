"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function KioskMaintenanceGuard() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastStateRef = useRef<boolean | null>(null);

  const checkMaintenance = useCallback(async () => {
    try {
      const response = await fetch(`/api/system-settings/kiosk_maintenance_mode`, {
        cache: "no-store",
      });
      const result = await response.json();
      const nextValue = String(result.value || "").toLowerCase() === "true";

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

    const channel = supabase
      .channel("kiosk-maintenance-mode")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "SystemSetting",
          filter: "key=eq.kiosk_maintenance_mode",
        },
        (payload) => {
          const record = payload.new as { value?: string } | null | undefined;
          const nextValue = String(record?.value || "").toLowerCase() === "true";
          lastStateRef.current = nextValue;
          setIsMaintenance(nextValue);
          setLoading(false);
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialCheckId);
      void supabase.removeChannel(channel);
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
            className="w-full max-w-2xl rounded-[3rem] border border-theme-primary/25 bg-white p-10 text-center shadow-2xl dark:bg-[#0b0f0d] sm:p-12"
          >
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-theme-primary/10 text-theme-primary sm:h-24 sm:w-24">
              <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <p className="text-[12px] font-black uppercase tracking-[0.45em] text-theme-primary sm:text-sm">
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
