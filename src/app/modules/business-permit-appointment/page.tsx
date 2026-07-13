"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserResident,
  getTransactionTypes,
  getAppointmentConfig,
  getBookedSlots,
  getPreviousPermits,
  getSystemThemeColor,
  getBploSettings
} from "./actions";
import { BusinessPermitAppointmentClient } from "./BusinessPermitAppointmentClient";

function BusinessPermitAppointmentWrapper() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [residentData, setResidentData] = useState<any>(null);
  const [permitTypes, setPermitTypes] = useState<any[]>([]);
  const [appointmentConfig, setAppointmentConfig] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [hasActivePermit, setHasActivePermit] = useState(false);
  const [previousPermits, setPreviousPermits] = useState<any[]>([]);
  const [themeColor, setThemeColor] = useState<string>("#059669");
  const [bploSettings, setBploSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const savedResident = sessionStorage.getItem("active_resident");
        if (!savedResident) {
          router.push("/");
          return;
        }

        const resident = JSON.parse(savedResident);
        const userId = resident.userId || resident.id;

        const [typesRes, configRes, bookedRes, residentRes, permitsRes, themeRes, settingsRes] = await Promise.all([
          getTransactionTypes(),
          getAppointmentConfig(),
          getBookedSlots(),
          getCurrentUserResident(userId),
          getPreviousPermits(userId),
          getSystemThemeColor(),
          getBploSettings()
        ]);

        if (typesRes.success) {
          setPermitTypes(typesRes.data || []);
        }
        if (configRes.success) {
          setAppointmentConfig(configRes.data);
        }
        if (bookedRes.success) {
          setBookedSlots(bookedRes.data || []);
        }
        if (residentRes.success && residentRes.data) {
          setResidentData(residentRes.data);
        }
        if (permitsRes.success) {
          setPreviousPermits(permitsRes.data || []);
        }
        if (themeRes && themeRes.success && themeRes.data) {
          setThemeColor(themeRes.data);
        }
        if (settingsRes && settingsRes.success) {
          setBploSettings(settingsRes.data);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-6 select-none">
        <div className="w-20 h-20 border-8 border-slate-100 border-t-theme-primary rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-theme-primary font-black text-xs uppercase tracking-[0.4em] animate-pulse">Loading Config</p>
          <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">Checking slot availability...</p>
        </div>
      </div>
    );
  }

  return (
    <BusinessPermitAppointmentClient
      resident={residentData}
      permitTypes={permitTypes}
      config={appointmentConfig}
      bookedSlots={bookedSlots}
      hasActivePermit={hasActivePermit}
      previousPermits={previousPermits}
      themeColor={themeColor}
      bploSettings={bploSettings}
    />
  );
}

export default function BusinessPermitAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <div className="w-20 h-20 border-8 border-slate-100 border-t-theme-primary rounded-full animate-spin"></div>
      </div>
    }>
      <BusinessPermitAppointmentWrapper />
    </Suspense>
  );
}
