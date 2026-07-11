"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserResident,
  getTransactionTypes,
  getAppointmentConfig,
  getBookedSlots
} from "./actions";
import { CedulaAppointmentClient } from "./CedulaAppointmentClient";

function CedulaAppointmentWrapper() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [residentData, setResidentData] = useState<any>(null);
  const [cedulaTypes, setCedulaTypes] = useState<any[]>([]);
  const [appointmentConfig, setAppointmentConfig] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [hasActiveIndividual, setHasActiveIndividual] = useState(false);
  const [hasActiveJuridical, setHasActiveJuridical] = useState(false);

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

        const [typesRes, configRes, bookedRes, residentRes] = await Promise.all([
          getTransactionTypes(),
          getAppointmentConfig(),
          getBookedSlots(),
          getCurrentUserResident(userId)
        ]);

        if (typesRes.success) {
          setCedulaTypes(typesRes.data || []);
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
    <CedulaAppointmentClient
      resident={residentData}
      cedulaTypes={cedulaTypes}
      config={appointmentConfig}
      bookedSlots={bookedSlots}
      hasActiveIndividual={hasActiveIndividual}
      hasActiveJuridical={hasActiveJuridical}
    />
  );
}

export default function CedulaAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <div className="w-20 h-20 border-8 border-slate-100 border-t-theme-primary rounded-full animate-spin"></div>
      </div>
    }>
      <CedulaAppointmentWrapper />
    </Suspense>
  );
}
