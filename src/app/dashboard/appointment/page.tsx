"use client";

import React, { useEffect, useState } from "react";
import { 
  Clock, 
  CheckCircle2, 
  Home,
  FileText,
  Activity,
  DollarSign,
  Search,
  Package,
  UserCheck,
  Truck,
  X,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  CalendarDays,
  QrCode
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserTransactions } from "./actions";
import ServiceHeader from "@/components/shared/ServiceHeader";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";

// Display dates/times in Philippine Standard Time (Asia/Manila) regardless of server or client timezone
function formatPHDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function KioskAppointmentsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterMode, setFilterMode] = useState<"active" | "all">("active");

  const ACTIONABLE_STATUSES = new Set([
    "FOR_REQUESTING",
    "FOR_REVISION",
    "FOR_INSPECTION",
    "FOR_REINSPECTION",
    "FOR_PROCESSING",
    "EVALUATED",
    "UNPAID",
    "FOR_CLAIM"
  ]);

  const isActionable = (req: any) => {
    if (req.isCancelled) return false;
    return ACTIONABLE_STATUSES.has(req.status);
  };

  const activeRequestsCount = requests.filter(isActionable).length;

  useEffect(() => {
    const savedResident = sessionStorage.getItem("active_resident");
    if (!savedResident) {
      router.push("/");
      return;
    }
    try {
      const parsed = JSON.parse(savedResident);
      const uid = parsed.userId || parsed.id;
      setUserId(uid);
    } catch (e) {
      console.error(e);
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    async function fetchRequests() {
      try {
        const res = await getUserTransactions(userId!);
        if (res.success) {
          setRequests(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load appointments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, [userId]);

  const getStatusStyle = (req: any) => {
    if (req.isCancelled) {
      return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: X, label: "CANCELLED" };
    }
    const status = req.status;
    switch (status) {
      case "FOR_REVISION": return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertCircle, label: "NEEDS REVISION" };
      case "FOR_REQUESTING": 
        if (req.type?.code?.startsWith("LCR_") || req.type?.code?.startsWith("CIVIL_REGISTRY")) {
          return { color: "text-white", bg: "bg-amber-500", border: "border-transparent", icon: Clock, label: "AWAITING TREASURY" };
        }
        return { color: "text-white", bg: "bg-theme-primary", border: "border-transparent", icon: Clock, label: "FOR EVALUATION" };
      case "FOR_INSPECTION": return { color: "text-white", bg: "bg-blue-600", border: "border-transparent", icon: Search, label: "UNDER INSPECTION" };
      case "EVALUATED": return { color: "text-white", bg: "bg-theme-primary", border: "border-transparent", icon: DollarSign, label: "EVALUATED" };
      case "PAID": return { color: "text-white", bg: "bg-emerald-500", border: "border-transparent", icon: CheckCircle2, label: "PAID" };
      case "FOR_PROCESSING": return { color: "text-white", bg: "bg-blue-500", border: "border-transparent", icon: Activity, label: "PROCESSING" };
      case "FOR_CLAIM": return { color: "text-white", bg: "bg-amber-500", border: "border-transparent", icon: UserCheck, label: "READY TO CLAIM" };
      case "RELEASED": return { color: "text-white", bg: "bg-emerald-600", border: "border-transparent", icon: CheckCircle2, label: "RELEASED" };
      case "REJECTED": return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: X, label: "DECLINED" };
      default: return { color: "text-white", bg: "bg-theme-primary", border: "border-transparent", icon: Clock, label: status.replace("_", " ") };
    }
  };

  const filteredRequests = requests.filter(r => {
    // Status filter
    if (filterMode === "active" && !isActionable(r)) {
      return false;
    }

    // Search query filter
    const matchesSearch = 
      r.type?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 dark:bg-[#050816] transition-colors duration-300 font-sans select-none overflow-y-auto overscroll-contain scroll-smooth">
      <SecureIdleTimer />
      <ServiceHeader />

      <main className="flex-1 max-w-6xl mx-auto px-6 md:px-12 py-10 pb-24 w-full space-y-6 relative">
        {/* Navigation & Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-theme-primary transition-all active:scale-95 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 rounded-xl shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none pt-2">
              Queue & Appointment <span className="text-theme-primary">Transactions</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">
              View appointments requiring your physical presence or action at the municipal hall.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
              <Input 
                placeholder="Search ticket ID or service name..." 
                className="h-12 pl-12 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-bold italic transition-all focus:ring-4 focus:ring-theme-primary/10 text-xs w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="h-12 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-theme-primary/40 hover:text-theme-primary font-black uppercase tracking-widest text-[9px] italic flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Date: {sortDirection === "desc" ? "Newest" : "Oldest"}</span>
            </button>
          </div>
        </div>

        {/* Action-Oriented Touch Filter Tabs */}
        <div className="flex items-center gap-3 p-1.5 bg-slate-200/60 dark:bg-white/5 rounded-2xl w-fit border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setFilterMode("active")}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 ${
              filterMode === "active"
                ? "bg-theme-primary text-white shadow-md shadow-theme-primary/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {activeRequestsCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeRequestsCount > 0 ? "bg-emerald-500" : "bg-slate-400"}`}></span>
            </span>
            <span>Needs Action / Upcoming</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              filterMode === "active" ? "bg-white/20 text-white" : "bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-slate-300"
            }`}>
              {activeRequestsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 ${
              filterMode === "all"
                ? "bg-theme-primary text-white shadow-md shadow-theme-primary/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>All History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              filterMode === "all" ? "bg-white/20 text-white" : "bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-slate-300"
            }`}>
              {requests.length}
            </span>
          </button>
        </div>

        {/* List of Applications */}
        <div className="space-y-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#0c1120] rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col md:flex-row items-center gap-8 h-28" />
            ))
          ) : sortedRequests.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sortedRequests.map((req) => {
                const style = getStatusStyle(req);
                const StatusIcon = style.icon;

                return (
                  <div 
                    key={req.id} 
                    onClick={() => router.push(`/dashboard/appointment/${req.id}`)}
                    className="group bg-white dark:bg-[#0c1120] rounded-2xl border border-slate-200/60 dark:border-white/5 p-6 hover:border-theme-primary/40 hover:shadow-xl hover:scale-[1.005] transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 group-hover:bg-theme-primary/10 flex items-center justify-center text-slate-400 group-hover:text-theme-primary transition-all duration-300 shadow-inner">
                        <CalendarDays className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-theme-primary transition-colors">
                            #{req.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">•</span>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                            {formatPHDate(req.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-theme-primary transition-colors uppercase tracking-tight leading-none pt-1">
                          {req.type?.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        {req.totalAmount && Number(req.totalAmount) > 0 
                          ? `₱${Number(req.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                          : "Assessment Pending"}
                      </span>

                      <div className="flex items-center gap-2">
                        <Badge className={`border px-3 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg ${style.bg} ${style.color} ${style.border}`}>
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{style.label}</span>
                          </div>
                        </Badge>
                        <div className="h-9 w-9 bg-slate-50 dark:bg-white/5 group-hover:bg-theme-primary rounded-lg flex items-center justify-center transition-all duration-300">
                          <QrCode className="w-4 h-4 text-slate-400 dark:text-slate-300 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0c1120] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center space-y-4 shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                <CalendarDays className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {filterMode === "active" ? "No Pending Actions" : "No Queue Tickets Found"}
                </h3>
                <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto">
                  {filterMode === "active"
                    ? "You don't have any appointments that require your attention right now. All caught up!"
                    : "You haven't filed any transactions or appointments yet. Tap the button below to start an application!"}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                {filterMode === "active" && requests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 active:scale-95 transition-all hover:bg-slate-200"
                  >
                    View History ({requests.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center justify-center rounded-xl bg-theme-primary px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all"
                >
                  Apply For Services
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
