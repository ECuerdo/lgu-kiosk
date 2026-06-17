"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, LogOut, User, X } from "lucide-react";

type Resident = {
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  barangay?: string;
  municipality?: string;
  photoUrl?: string;
  livenessUrl?: string;
  imageUrl?: string;
  idFrontUrl?: string;
};

const SERVICE_NAMES: Record<string, string> = {
  "building-permit": "Building Permit",
};

function formatServiceName(segment: string) {
  return SERVICE_NAMES[segment] || segment.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export default function ServiceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [resident, setResident] = useState<Resident | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const serviceName = useMemo(() => {
    const segment = pathname.split("/").filter(Boolean)[1] || "Service";
    return formatServiceName(segment);
  }, [pathname]);

  useEffect(() => {
    const saved = sessionStorage.getItem("active_resident");
    if (!saved) {
      router.replace("/");
      return;
    }
    try {
      setResident(JSON.parse(saved));
    } catch {
      sessionStorage.removeItem("active_resident");
      router.replace("/");
    }
  }, [router]);

  const displayName =
    resident?.fullName ||
    [resident?.firstName, resident?.middleName, resident?.lastName].filter(Boolean).join(" ") ||
    "Resident";
  const residentPhotoUrl =
    resident?.photoUrl ||
    resident?.livenessUrl ||
    resident?.imageUrl ||
    resident?.idFrontUrl;
  const isDarkMode = (resolvedTheme || theme) === "dark";

  const logout = () => {
    sessionStorage.removeItem("active_resident");
    router.replace("/");
  };

  return (
    <>
      <header className="z-50 flex h-24 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 md:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-emerald-50 hover:text-[#1a6b3a] dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-emerald-950/50" aria-label="Dashboard">
            <Home className="h-5 w-5" />
          </Link>
          <span className="hidden h-12 w-1 rounded-full bg-[#1a6b3a] sm:block" />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Municipal Service</p>
            <h1 className="truncate text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {serviceName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button type="button" onClick={() => setProfileOpen(true)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800 md:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-[#1a6b3a] dark:bg-emerald-950/60 dark:text-emerald-300">
              {residentPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={residentPhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : <User className="h-5 w-5" />}
            </span>
            <span className="hidden md:block">
              <span className="block text-[8px] font-black uppercase tracking-widest text-emerald-600">Verified Resident</span>
              <span className="block max-w-48 truncate text-xs font-black text-slate-800 dark:text-slate-100">{displayName}</span>
            </span>
          </button>
        </div>
      </header>

      {profileOpen && resident && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl transition-colors dark:bg-slate-950 dark:shadow-black/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#1a6b3a]">Resident Profile</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{displayName}</h2>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/60">
              <ProfileRow label="Email" value={resident.email} />
              <ProfileRow label="Contact Number" value={resident.contactNumber} />
              <ProfileRow label="Barangay" value={resident.barangay} />
              <ProfileRow label="Municipality" value={resident.municipality || "Mapandan"} />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800"
              >
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Theme</span>
                  <span className="mt-1 block text-sm font-black text-slate-900 dark:text-white">
                    {isDarkMode ? "Dark Mode" : "Light Mode"}
                  </span>
                </span>
                <span className={`relative flex h-8 w-14 items-center rounded-full p-1 transition-colors ${isDarkMode ? "bg-[#1a6b3a]" : "bg-slate-200"}`}>
                  <span className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${isDarkMode ? "translate-x-6" : "translate-x-0"}`} />
                </span>
              </button>
              <button type="button" onClick={logout} className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 transition hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-200 pb-3 last:border-0 last:pb-0 dark:border-slate-800"><span className="font-bold text-slate-400 dark:text-slate-500">{label}</span><span className="text-right font-black text-slate-700 dark:text-slate-100">{value || "Not provided"}</span></div>;
}
