"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, 
  Check, 
  CreditCard, 
  Loader2, 
  QrCode, 
  ShieldCheck, 
  Truck, 
  Wallet,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getTransactionForCheckout, saveGlobalCheckoutDetails } from "../actions";
import { cn } from "@/lib/utils";

const MAPANDAN_BARANGAYS = [
  "Asongan", "Baloling", "Banaoang", "Bantay", "Bantocaling",
  "Baracbac", "Buenlag", "Caoayan", "Dulag", "Guesang",
  "Lipit Norte", "Lipit Sur", "Macalong", "Magsaysay", "Nancamarinan",
  "Osiem", "Paitan", "Pangalangan", "Poblacion", "Potpot",
  "Primicias", "San Miguel", "San Vicente", "Santa Maria", "Talogtog",
  "Tebag", "Tebag East", "Tebag West", "Warding"
];

export type PaymentMethod = "gcash" | "qrph" | "dob";
export type FulfillmentMethod = "PICK_UP" | "DELIVERY";

export interface DeliveryAddress {
  barangay: string;
  houseNumber: string;
  street: string;
  sitio: string;
  purok: string;
  municipality: string;
  province: string;
  landmark: string;
}

const emptyAddress: DeliveryAddress = {
  barangay: "",
  houseNumber: "",
  street: "",
  sitio: "",
  purok: "",
  municipality: "Mapandan",
  province: "Pangasinan",
  landmark: "",
};

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("PICK_UP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gcash");
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedResident = sessionStorage.getItem("active_resident");
    if (!savedResident) {
      router.push("/");
      return;
    }
    const resident = JSON.parse(savedResident);
    const uId = resident.userId || resident.id;
    setUserId(uId);

    async function loadData() {
      try {
        const res = await getTransactionForCheckout(transactionId, uId);
        if (res.success && res.data) {
          setTransaction(res.data);
          // Pre-populate fulfillment if already configured in DB
          if (res.data.fulfillmentType) {
            setFulfillment(res.data.fulfillmentType);
          }
          if (res.data.deliveryAddress) {
            setAddress(prev => ({
              ...prev,
              ...(res.data.deliveryAddress as Partial<DeliveryAddress>)
            }));
          }
        } else {
          setError(res.error || "Failed to load transaction.");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading payment data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [transactionId, router]);

  const deliveryFee = 50;
  const appliedDeliveryFee = fulfillment === "DELIVERY" ? deliveryFee : 0;
  const baseAmount = transaction?.totalAmount || 0;
  const totalAmount = baseAmount + appliedDeliveryFee;

  const formattedTotal = useMemo(
    () => totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [totalAmount]
  );

  const updateAddress = (field: keyof DeliveryAddress, value: string) => {
    setAddress(current => ({ ...current, [field]: value }));
  };

  const handleCheckout = async () => {
    if (!userId || !transaction) return;
    if (fulfillment === "DELIVERY" && !address.barangay) {
      setError("Barangay is required for home delivery.");
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const details = {
        fulfillmentType: fulfillment,
        paymentMethod,
        deliveryAddress: address,
        deliveryFee: appliedDeliveryFee,
        totalAmount
      };

      const saveRes = await saveGlobalCheckoutDetails(transaction.id, userId, details);
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save checkout options.");
      }

      // Determine clean redirect path based on type
      let returnPath = "/modules/cedula";
      if (transaction.type?.code?.startsWith("BUSINESS")) {
        returnPath = "/modules/business-permit";
      } else if (transaction.type?.code?.startsWith("BUILDING")) {
        returnPath = "/modules/building-permit";
      }

      const response = await fetch("/api/paymongo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          type: paymentMethod,
          transactionId: transaction.id,
          reference: transaction.type?.name || "Municipal Service Payment",
          redirectPath: returnPath,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error?.[0]?.detail || data?.error || "PayMongo initialization failed.";
        throw new Error(typeof msg === "string" ? msg : "Checkout creation failed.");
      }

      const checkoutUrl = data?.data?.attributes?.checkout_url;
      if (!checkoutUrl) throw new Error("PayMongo secure url not returned.");
      window.location.assign(checkoutUrl);
    } catch (checkoutError: any) {
      setError(checkoutError.message || "Unable to start secure checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0d0f14] gap-6">
        <div className="w-16 h-16 border-8 border-slate-800 border-t-[#1a6b3a] rounded-full animate-spin"></div>
        <p className="text-[#1a6b3a] font-black text-xs uppercase tracking-[0.4em] animate-pulse">Syncing Payment Gateway...</p>
      </div>
    );
  }

  // Dynamic back path
  let backPath = "/modules/cedula";
  if (transaction?.type?.code?.startsWith("BUSINESS")) {
    backPath = "/modules/business-permit";
  } else if (transaction?.type?.code?.startsWith("BUILDING")) {
    backPath = "/modules/building-permit";
  }

  return (
    <div className="h-screen w-full bg-[#0d0f14] text-white font-sans select-none overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10 pb-64">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link 
            href={backPath}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={16} />
            Cancel & Return
          </Link>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
            REF: {transaction?.id?.slice(-12).toUpperCase()}
          </span>
        </div>

        {/* Outer Payment Grid */}
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] text-left">
          
          {/* Left Column: Treasury assessment card */}
          <section className="relative overflow-hidden rounded-[2.5rem] bg-[#11131a] border border-white/5 p-8 flex flex-col justify-between min-h-[380px] shadow-2xl">
            {/* Subtle background card watermark */}
            <CreditCard className="absolute right-4 top-12 h-44 w-44 rotate-12 text-[#1a6b3a]/[0.03] pointer-events-none" />
            
            <div className="relative space-y-6">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.35em] text-[#1a6b3a]">
                  <ShieldCheck className="h-4.5 w-4.5" /> Treasury Protocol
                </p>
                <p className="mt-3 text-xs font-semibold italic text-slate-400">
                  Evaluation complete. Secure your issuance.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Assessment Amount</span>
                  <span className="font-black italic text-slate-200">₱{baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {fulfillment === "DELIVERY" && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Delivery Surcharge</span>
                    <span className="font-black italic text-[#1a6b3a]">₱{appliedDeliveryFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative pt-6 border-t border-white/5 flex items-end justify-between mt-8">
              <div>
                <p className="text-[10px] font-black italic uppercase tracking-[0.3em] text-[#1a6b3a] leading-none">Total Amount</p>
                <p className="text-[8px] font-bold uppercase text-slate-500 leading-none mt-1">Payable via secure channel</p>
              </div>
              <p className="text-3xl font-black italic text-[#1a6b3a]">₱{formattedTotal}</p>
            </div>
          </section>

          {/* Right Column: Checkout forms */}
          <section className="space-y-8 rounded-[2.5rem] border border-white/5 bg-[#11131a] p-8 shadow-2xl">
            
            {/* Deployment Strategy */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Truck className="w-5 h-5 text-[#1a6b3a]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic">Deployment Strategy</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFulfillment("PICK_UP")}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 text-center flex flex-col items-center gap-3 transition-all duration-300 relative cursor-pointer",
                    fulfillment === "PICK_UP" 
                      ? "border-[#1a6b3a] bg-[#1a6b3a]/5 text-white" 
                      : "border-white/5 bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {fulfillment === "PICK_UP" && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1a6b3a] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <Building2 className="w-8 h-8 text-[#1a6b3a]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Office Pickup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillment("DELIVERY")}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 text-center flex flex-col items-center gap-3 transition-all duration-300 relative cursor-pointer",
                    fulfillment === "DELIVERY" 
                      ? "border-[#1a6b3a] bg-[#1a6b3a]/5 text-white" 
                      : "border-white/5 bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {fulfillment === "DELIVERY" && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1a6b3a] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <Truck className="w-8 h-8 text-[#1a6b3a]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Home Delivery</span>
                </button>
              </div>
            </div>

            {/* Address fields for delivery */}
            {fulfillment === "DELIVERY" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6 animate-in fade-in duration-300 text-left">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Barangay</label>
                  <select
                    value={address.barangay}
                    onChange={e => updateAddress("barangay", e.target.value)}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  >
                    <option value="" disabled className="bg-slate-900">Select Barangay</option>
                    {MAPANDAN_BARANGAYS.map(bg => (
                      <option key={bg} value={bg} className="bg-slate-900">{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">House / Lot No. (Optional)</label>
                  <input
                    type="text"
                    value={address.houseNumber}
                    onChange={e => updateAddress("houseNumber", e.target.value)}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Street Name (Optional)</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={e => updateAddress("street", e.target.value)}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Sitio</label>
                  <input
                    type="text"
                    value={address.sitio}
                    onChange={e => updateAddress("sitio", e.target.value)}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Purok</label>
                  <input
                    type="text"
                    value={address.purok}
                    onChange={e => updateAddress("purok", e.target.value)}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Landmark / Instructions</label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={e => updateAddress("landmark", e.target.value)}
                    placeholder="e.g. Near Mapandan Elementary School"
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/10 px-4 text-xs font-bold text-white focus:outline-none focus:border-[#1a6b3a]"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-5 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <CreditCard className="w-5 h-5 text-[#1a6b3a]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a6b3a] italic">Payment Channel</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("gcash")}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all duration-300 relative cursor-pointer",
                    paymentMethod === "gcash" 
                      ? "border-[#1a6b3a] bg-[#1a6b3a]/5 text-white" 
                      : "border-white/5 bg-white/5 hover:border-white/10 text-slate-400"
                  )}
                >
                  {paymentMethod === "gcash" && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a6b3a] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <Wallet className="w-6 h-6 text-[#1a6b3a]" />
                  <span className="text-[9px] font-black uppercase">GCash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("qrph")}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all duration-300 relative cursor-pointer",
                    paymentMethod === "qrph" 
                      ? "border-[#1a6b3a] bg-[#1a6b3a]/5 text-white" 
                      : "border-white/5 bg-white/5 hover:border-white/10 text-slate-400"
                  )}
                >
                  {paymentMethod === "qrph" && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a6b3a] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <QrCode className="w-6 h-6 text-[#1a6b3a]" />
                  <span className="text-[9px] font-black uppercase">QRPh Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("dob")}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all duration-300 relative cursor-pointer",
                    paymentMethod === "dob" 
                      ? "border-[#1a6b3a] bg-[#1a6b3a]/5 text-white" 
                      : "border-white/5 bg-white/5 hover:border-white/10 text-slate-400"
                  )}
                >
                  {paymentMethod === "dob" && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a6b3a] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <Building2 className="w-6 h-6 text-[#1a6b3a]" />
                  <span className="text-[9px] font-black uppercase font-sans whitespace-nowrap">Banking</span>
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full h-14 bg-[#1a6b3a] hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  `Proceed to secure ${paymentMethod.toUpperCase()} checkout (₱${formattedTotal})`
                )}
              </button>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
