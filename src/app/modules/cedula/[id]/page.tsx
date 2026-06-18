"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Sparkles, 
  Printer,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getCedulaTransactionById, cancelTransaction, saveCedulaCheckoutDetails, reconcileCedulaPayment } from "../actions";
import PaymentModal, { CheckoutDetails } from "@/components/shared/PaymentModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { cn } from "@/lib/utils";

function formatPHDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function CedulaTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "records" | "logistics">("overview");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document Preview States
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");

  // Custom Toast helper
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRequest = useCallback(async (uId: string) => {
    try {
      const res = await getCedulaTransactionById(id, uId);
      if (res.success && res.data) {
        setRequest(res.data);
      } else {
        showToast(res.error || "Unable to fetch request details.", "error");
        router.push("/modules/cedula");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading transaction.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const savedResident = sessionStorage.getItem("active_resident");
    if (!savedResident) {
      router.push("/");
      return;
    }
    const resident = JSON.parse(savedResident);
    const uId = resident.userId || resident.id;
    setUserId(uId);

    fetchRequest(uId);
  }, [fetchRequest, router]);

  const handleCancel = async () => {
    if (!userId || !request || isSubmitting) return;
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setIsSubmitting(true);
    try {
      const res = await cancelTransaction(request.id, userId);
      if (res.success) {
        showToast("Request cancelled successfully.", "success");
        fetchRequest(userId);
      } else {
        showToast(res.error || "Unable to cancel application.", "error");
      }
    } catch {
      showToast("Error cancelling request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCheckout = async (details: CheckoutDetails) => {
    if (!userId || !request) return false;
    try {
      const res = await saveCedulaCheckoutDetails(request.id, userId, {
        fulfillmentType: details.fulfillmentType,
        paymentMethod: details.paymentMethod,
        deliveryAddress: details.deliveryAddress,
        deliveryFee: details.deliveryFee,
        totalAmount: details.totalAmount
      });
      if (res.success) {
        await fetchRequest(userId);
        return true;
      }
      showToast(res.error || "Failed to finalize checkout.", "error");
      return false;
    } catch {
      showToast("Checkout process failed.", "error");
      return false;
    }
  };

  const handleVerifyPayment = async () => {
    if (!userId || !request) return false;
    try {
      const res = await reconcileCedulaPayment(request.id, userId);
      if (res.success && res.paid) {
        showToast("Payment verified successfully!", "success");
        await fetchRequest(userId);
        return true;
      }
      showToast(res.error || "Payment verification pending or failed.", "warning");
      return false;
    } catch {
      showToast("Verification failed.", "error");
      return false;
    }
  };

  const handlePrintDocument = async (documentUrl: string, title: string) => {
    try {
      showToast(`Preparing ${title}...`, "info");
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error("Could not download file.");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.src = blobUrl;
      
      printFrame.onload = () => {
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setTimeout(() => {
            printFrame.remove();
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        }, 350);
      };
      
      document.body.appendChild(printFrame);
    } catch {
      showToast("Unable to load document for printing.", "error");
    }
  };

  if (loading || !request) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0F172A] gap-6">
        <div className="w-16 h-16 border-8 border-slate-800 border-t-[#1a6b3a] rounded-full animate-spin"></div>
        <p className="text-[#1a6b3a] font-black text-xs uppercase tracking-[0.4em] animate-pulse">Syncing Details...</p>
      </div>
    );
  }

  const isJuridical = request.type?.code === "CEDULA_JUR";
  const isStudent = request.isStudent;
  const isCancelled = request.isCancelled;

  // Determine Logistics Phase text
  let logisticsPhase = "PENDING EVALUATION";
  if (isCancelled) logisticsPhase = "CANCELLED";
  else if (request.status === "EVALUATED") logisticsPhase = "EVALUATED";
  else if (request.status === "FOR_PROCESSING") logisticsPhase = "PROCESSING";
  else if (request.status === "FOR_CLAIM") logisticsPhase = "READY FOR CLAIMING";
  else if (["RELEASED", "DELIVERED"].includes(request.status)) logisticsPhase = "COMPLETED";

  // Determine Payment Phase text
  let paymentPhase = "PENDING ASSESSMENT";
  if (isCancelled) paymentPhase = "CANCELLED";
  else if (request.status === "EVALUATED" || request.status === "UNPAID") paymentPhase = "UNPAID";
  else if (["PAID", "FOR_PROCESSING", "FOR_CLAIM", "RELEASED", "DELIVERED"].includes(request.status)) paymentPhase = "PAID";

  return (
    <div className="h-screen w-full bg-[#0d0f14] text-white font-sans select-none overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 md:px-16 py-10 space-y-10 pb-64">
      
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-xl bg-slate-900 text-white border-slate-800">
          <AlertCircle className="w-5 h-5 text-[#1a6b3a]" />
          <span className="text-sm font-bold">{toastMessage.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Link href="/dashboard" className="hover:text-white transition-colors">Home</Link>
          <span>&gt;</span>
          <Link href="/modules/cedula" className="hover:text-white transition-colors">Requests</Link>
          <span>&gt;</span>
          <span className="text-[#1a6b3a]">Tracker</span>
        </nav>

        {/* Back navigation */}
        <div className="flex items-center">
          <Link 
            href="/modules/cedula" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} />
            Back to List
          </Link>
        </div>
      </div>

      {/* Tracker Hub Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1a6b3a] flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="space-y-1.5 text-left">
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
              COMMUNITY TAX CERTIFICATE - {isStudent ? "STUDENT" : isJuridical ? "JURIDICAL" : "INDIVIDUAL"} <span className="text-[#1a6b3a] not-italic">HUB</span>
            </h1>
            <div className="inline-block mt-2">
              <span className={cn(
                "px-3.5 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
                isCancelled ? "bg-red-500/10 border-red-500/20 text-red-500" :
                request.status === "FOR_REQUESTING" ? "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse" :
                "bg-[#1a6b3a]/10 border-[#1a6b3a]/20 text-[#1a6b3a]"
              )}>
                {isCancelled ? "CANCELLED" : request.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-1 max-w-md bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
          {(["overview", "records", "logistics"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                activeSubTab === tab
                  ? "bg-[#1a6b3a] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {request.status === "FOR_REQUESTING" && !isCancelled && (
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 text-rose-500 font-bold uppercase tracking-wider text-[10px] transition-all active:scale-95 cursor-pointer"
          >
            Cancel Request
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className={cn(
        activeSubTab === "overview" ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "w-full"
      )}>
        
        {/* Left main area (spanning 2 columns on overview, full width otherwise) */}
        <div className={cn(
          activeSubTab === "overview" ? "lg:col-span-2 space-y-6" : "w-full space-y-6"
        )}>
          
          {/* TAB CONTENT: OVERVIEW */}
          {activeSubTab === "overview" && (
            <div className="bg-[#11131a] rounded-[2.5rem] border border-white/5 p-8 md:p-10 shadow-2xl space-y-8 text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                Application Matrix
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs uppercase font-black text-slate-500">Service Requested</p>
                  <p className="text-sm md:text-base font-black italic uppercase text-slate-200">
                    {request.type?.name || "Community Tax Certificate"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs uppercase font-black text-slate-500">Date Submitted</p>
                  <p className="text-sm md:text-base font-black italic text-slate-200">
                    {request.createdAt ? formatPHDate(request.createdAt) : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs uppercase font-black text-slate-500">Logistics Phase</p>
                  <p className="text-sm md:text-base font-black italic uppercase text-[#1a6b3a]">
                    {logisticsPhase}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs uppercase font-black text-slate-500">Payment Status</p>
                  <p className="text-sm md:text-base font-black italic uppercase text-[#1a6b3a]">
                    {paymentPhase}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: RECORDS */}
          {activeSubTab === "records" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
              
              {/* Left Column: Personal Identity & Financial Declarations */}
              <div className="space-y-8">
                
                {/* Personal Identity */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                    Personal Identity
                  </h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Name</p>
                      <p className="text-sm font-black italic uppercase text-slate-100">
                        {request.residentSnapshot?.firstName} {request.residentSnapshot?.middleName ? request.residentSnapshot.middleName + ' ' : ''}{request.residentSnapshot?.lastName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Birth Date</p>
                      <p className="text-sm font-black italic text-slate-100">
                        {request.residentSnapshot?.birthdate ? formatPHDate(request.residentSnapshot.birthdate) : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Civil Status</p>
                      <p className="text-sm font-black italic uppercase text-slate-100">
                        {request.residentSnapshot?.civilStatus || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Citizenship</p>
                      <p className="text-sm font-black italic uppercase text-slate-100">
                        {request.residentSnapshot?.citizenship || "FILIPINO"}
                      </p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Contact Number</p>
                      <p className="text-sm font-black italic text-slate-100">
                        {request.residentSnapshot?.phoneNumber || request.residentSnapshot?.contactNumber || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Email Address</p>
                      <p className="text-sm font-black italic text-slate-100">
                        {request.residentSnapshot?.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Declarations */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                    Financial Declarations
                  </h3>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Annual Gross Income</p>
                    <p className="text-2xl font-black italic text-[#1a6b3a]">
                      ₱{(request.additionalData?.income ? Number(request.additionalData.income).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0")}
                    </p>
                  </div>
                </div>

              </div>

              {/* Right Column: Registered Address Card */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                  Registered Address
                </h3>
                
                <div className="bg-[#11131a] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col gap-6 justify-center min-h-[200px] shadow-xl">
                  {/* Subtle map icon in background */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-32 h-32 text-[#1a6b3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">HOUSE / STREET</span>
                      <span className="block text-sm font-black italic uppercase text-slate-200 mt-1">
                        {request.residentSnapshot?.houseNumber || request.residentSnapshot?.street || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">SITIO / PUROK</span>
                      <span className="block text-sm font-black italic uppercase text-slate-200 mt-1">
                        {request.residentSnapshot?.sitio || request.residentSnapshot?.purok || "—"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">BARANGAY MATRIX</span>
                    <span className="block text-sm font-black italic uppercase text-slate-200 mt-1">
                      {request.residentSnapshot?.barangay ? `${request.residentSnapshot.barangay.toUpperCase()}, MAPANDAN` : "BANGAN-ODA, MAPANDAN"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: LOGISTICS */}
          {activeSubTab === "logistics" && (
            <div className="space-y-10 text-left">
              
              {/* Requirements preview cards */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                  Requirements
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                  {/* Valid ID Card */}
                  <div className="relative w-full aspect-[1.58/1] max-w-xs bg-slate-950/80 border border-white/5 rounded-[2rem] overflow-hidden group shadow-lg shadow-black/40 flex items-center justify-center">
                    {request.additionalData?.validIdUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={request.additionalData.validIdUrl} 
                        alt="Valid ID" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#11131a] to-emerald-950/20 opacity-80" />
                    )}
                    <button
                      onClick={() => {
                        setViewerUrl(request.additionalData?.validIdUrl || null);
                        setViewerTitle("Valid ID Preview");
                        setViewerOpen(true);
                      }}
                      className="relative z-10 px-6 py-2.5 bg-[#1a6b3a] hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      VIEW
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 py-3 bg-[#0d0f14]/90 backdrop-blur-sm border-t border-white/5 text-center z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                        VALID ID
                      </span>
                    </div>
                  </div>

                  {/* Financial Evidence / Proof of Income */}
                  <div className="relative w-full aspect-[1.58/1] max-w-xs bg-slate-950/80 border border-white/5 rounded-[2rem] overflow-hidden group shadow-lg shadow-black/40 flex items-center justify-center">
                    {request.additionalData?.proofOfIncomeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={request.additionalData.proofOfIncomeUrl} 
                        alt="Financial Evidence" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#11131a] to-emerald-950/20 opacity-80" />
                    )}
                    <button
                      onClick={() => {
                        setViewerUrl(request.additionalData?.proofOfIncomeUrl || null);
                        setViewerTitle(isStudent ? "Student Verification Preview" : "Financial Evidence Preview");
                        setViewerOpen(true);
                      }}
                      className="relative z-10 px-6 py-2.5 bg-[#1a6b3a] hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      VIEW
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 py-3 bg-[#0d0f14]/90 backdrop-blur-sm border-t border-white/5 text-center z-10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                        {isStudent ? "STUDENT VERIFICATION" : "FINANCIAL EVIDENCE"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fulfillment info shown cleanly at the bottom */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic border-l-4 border-[#1a6b3a] pl-4">
                  Fulfillment Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl bg-[#11131a] border border-white/5 rounded-3xl p-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Fulfillment Method</p>
                    <p className="text-sm font-black italic uppercase text-slate-200">
                      {request.fulfillmentType || "PICK_UP (Treasury Counter)"}
                    </p>
                  </div>
                  {request.paymentReference && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Payment Reference No.</p>
                      <p className="text-sm font-mono font-bold text-emerald-400">
                        {request.paymentReference}
                      </p>
                    </div>
                  )}
                  {request.fulfillmentType === "DELIVERY" && (
                    <>
                      <div className="space-y-1 col-span-2">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Delivery Address</p>
                        <p className="text-sm font-bold text-slate-200 uppercase">
                          {[
                            request.deliveryAddress?.houseNumber,
                            request.deliveryAddress?.street,
                            request.deliveryAddress?.barangay,
                            request.deliveryAddress?.municipality || "Mapandan",
                            request.deliveryAddress?.province || "Pangasinan"
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Delivery Fee</p>
                        <p className="text-sm font-bold text-[#1a6b3a]">
                          ₱{(request.fiscalSnapshot?.deliveryFee || 0).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Sidebar: Government Verification / Payment Card (Only shown in OVERVIEW) */}
        {activeSubTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-[#11131a] rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between min-h-[350px] shadow-2xl relative text-left">
              <div>
                <h3 className="text-[10px] font-black uppercase text-[#1a6b3a] tracking-widest mb-6">
                  Government Verification
                </h3>
                <p className="text-sm font-bold italic text-slate-300 leading-relaxed">
                  {isCancelled ? (
                    "This application has been cancelled by the requestor or municipal staff."
                  ) : request.status === "FOR_REQUESTING" ? (
                    "Standard professional assessment concludes within 3 business days. Our team is currently validating your documentary evidence."
                  ) : request.status === "FOR_CLAIM" ? (
                    "Your request is successfully processed and ready for claiming at the municipal treasury counter."
                  ) : ["RELEASED", "DELIVERED"].includes(request.status) ? (
                    "Community tax certificate has been released successfully."
                  ) : (
                    "Assessment calculations have been completed. Please settle the dues to release your document."
                  )}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-baseline">
                <div className="space-y-1">
                  <span className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest leading-none">Total Payable (Estimated)</span>
                  {request.status === "FOR_REQUESTING" && (
                    <span className="block text-[8px] text-amber-500 font-bold uppercase leading-none mt-1">* Pending evaluation</span>
                  )}
                </div>
                <span className="text-2xl font-black italic text-[#1a6b3a] leading-none">
                  ₱{(request.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex flex-col gap-3">
              {request.status === "FOR_CLAIM" && request.eCopyUrl && (
                <button
                  onClick={() => handlePrintDocument(request.eCopyUrl, "Cedula document")}
                  className="w-full py-4 bg-[#1a6b3a] hover:bg-emerald-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Printer size={16} />
                  Print Cedula
                </button>
              )}

              {(request.status === "UNPAID" || request.status === "EVALUATED") && !isCancelled && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full py-4 bg-[#1a6b3a] hover:bg-emerald-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-950/20 cursor-pointer transition-all active:scale-95"
                >
                  Pay Online
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Reusable Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          open={isPaymentModalOpen}
          onOpenChange={(open) => {
            setIsPaymentModalOpen(open);
            if (!open) {
              handleVerifyPayment();
            }
          }}
          transactionId={request.id}
          amount={request.totalAmount}
          onBeforeCheckout={handleSaveCheckout}
          referenceName="Cedula Tax Payment"
          redirectPath={`/modules/cedula/${request.id}`}
        />
      )}

      {/* Viewer Modal */}
      <DocumentViewerModal isOpen={viewerOpen} onClose={() => setViewerOpen(false)} file={null} fileUrl={viewerUrl} title={viewerTitle} />

      </div>
    </div>
  );
}
