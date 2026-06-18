/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element, @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import PaymentModal, { CheckoutDetails } from "@/components/shared/PaymentModal";
import {
  Book,
  CheckCircle,
  ClipboardList,
  FileSignature,
  FileText,
  Home,
  CreditCard,
  Landmark,
  MapPin,
  PenTool,
  Ruler,
  Scroll,
  ShieldCheck,
  UploadCloud,
  User,
  Users,
  Wallet,
  Zap,
  AlertCircle,
  CalendarDays,
  Clock,
  FileWarning,
  Building2,
  CheckCircle2,
  Upload,
  Hourglass,
  Receipt,
  Printer,
  Check,
  UserCheck,
  Handshake,
  QrCode,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Search,
  Volume2
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getCurrentUserResident,
  submitBirthCertificateRequest,
  saveTransactionSignature,
  getExistingBirthRequests,
  cancelTransaction,
  saveBirthCertificateCheckoutDetails,
  reconcileBirthCertificatePayment,
  getBarangayNames,
  getSecureUploadUrlAction
} from "./actions";

type Step = "EXISTING" | "GUIDE" | "IDENTITY" | "DETAILS" | "PARENTS" | "UPLOAD" | "SIGNATURE" | "TREASURY" | "SUBMIT";

const STEPS = [
  { id: "GUIDE", label: "Guide", icon: ClipboardList },
  { id: "IDENTITY", label: "Identity", icon: User },
  { id: "DETAILS", label: "Details", icon: Search },
  { id: "PARENTS", label: "Parents", icon: Users },
  { id: "UPLOAD", label: "Upload ID", icon: Upload },
  { id: "SIGNATURE", label: "Signature", icon: FileSignature },
  { id: "TREASURY", label: "Treasury", icon: Landmark },
  { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

const RELATION_OPTIONS = [
  "Self (Aplikante)",
  "Parent (Magulang)",
  "Spouse (Asawa)",
  "Child (Anak)",
  "Sibling (Kapatid)",
  "Guardian / Authorized Representative"
];



const DOC_TYPE_OPTIONS = [
  "Birth Certificate",
  "Copy",
  "Certified True Copy",
  "Authenticated Copy"
];

// --- UPLOAD FILE SECURELY VIA SIGNED UPLOAD URL ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'bin';

  const res = await getSecureUploadUrlAction(fieldName, "lcr/birth_certificate_request", fileExt, userId);
  if (!res.success || !res.signedUrl || !res.publicUrl) {
    throw new Error(res.error || "Failed to generate secure upload destination");
  }

  const uploadRes = await fetch(res.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload direct to storage failed: ${uploadRes.statusText}`);
  }

  return res.publicUrl;
}

const formatBirthDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = String(d.getFullYear()).padStart(4, "0");
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return dateStr;
  }
};

export default function BirthCertificatePage() {
  const router = useRouter();
  const pageScrollRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>("EXISTING");
  const [hasReadGuide, setHasReadGuide] = useState(false);
  const [existingRequests, setExistingRequests] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [residentData, setResidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Digital Handoff (QR Code Upload) States
  const [idHandoffUrl, setIdHandoffUrl] = useState<string | null>(null);
  const [idHandoffFileName, setIdHandoffFileName] = useState("");
  const [handoffToken, setHandoffToken] = useState("");
  const [handoffQrCode, setHandoffQrCode] = useState("");
  const [handoffExpiresAt, setHandoffExpiresAt] = useState(0);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [isCreatingHandoff, setIsCreatingHandoff] = useState(false);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Structured formData matching LCR requirements
  const [formData, setFormData] = useState({
    certFirstName: "",
    certMiddleName: "",
    certLastName: "",
    certSuffix: "",
    sex: "",
    dateOfEvent: "",
    placeOfEvent: "Mapandan, Pangasinan",
    fatherFirstName: "",
    fatherMiddleName: "",
    fatherLastName: "",
    motherFirstName: "",
    motherMiddleName: "",
    motherLastName: "",
    relation: "Self (Aplikante)",
    contactNumber: "",
    email: "",
    occupation: "",
    certDocType: "Birth Certificate",
    newIdFile: null as File | null,
  });

  const [maxStepIdx, setMaxStepIdx] = useState(0);

  useEffect(() => {
    const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
    if (currentStepIdx > maxStepIdx) {
      setMaxStepIdx(currentStepIdx);
    }
  }, [currentStep, maxStepIdx]);

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Relationship flow auto-population logic
  useEffect(() => {
    if (!residentData) return;
    if (formData.relation === "Self (Aplikante)") {
      setFormData(prev => ({
        ...prev,
        certFirstName: residentData.firstName || "",
        certMiddleName: residentData.middleName || "",
        certLastName: residentData.lastName || "",
        certSuffix: residentData.suffix || "",
        sex: (residentData.gender || "").toUpperCase(),
        dateOfEvent: residentData.dateOfBirth ? new Date(residentData.dateOfBirth).toISOString().split('T')[0] : "",
        placeOfEvent: residentData.placeOfBirth || "Mapandan, Pangasinan",
        fatherFirstName: residentData.fatherFirstName || "",
        fatherMiddleName: residentData.fatherMiddleName || "",
        fatherLastName: residentData.fatherLastName || "",
        motherFirstName: residentData.motherFirstName || "",
        motherMiddleName: residentData.motherMiddleName || "",
        motherLastName: residentData.motherLastName || "",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        certFirstName: "",
        certMiddleName: "",
        certLastName: "",
        certSuffix: "",
        sex: "",
        dateOfEvent: "",
        placeOfEvent: "Mapandan, Pangasinan",
        fatherFirstName: "",
        fatherMiddleName: "",
        fatherLastName: "",
        motherFirstName: "",
        motherMiddleName: "",
        motherLastName: "",
      }));
    }
  }, [formData.relation, residentData]);

  // QR Upload handoff polling
  useEffect(() => {
    if (!handoffToken) return;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/upload-handoff/${encodeURIComponent(handoffToken)}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (result.status === "uploaded") {
          const files = result.files || [];
          if (files[0]) {
            setIdHandoffUrl(files[0].url);
            setIdHandoffFileName(files[0].fileName || "Valid ID Upload");
            setIsHandoffOpen(false);
            setHandoffToken("");
            toast.success("Document uploaded successfully from your device!");
          }
        } else if (!response.ok) {
          setIsHandoffOpen(false);
          setHandoffToken("");
          toast.error(result.error || "The QR upload session expired.");
        }
      } catch (error) {
        console.error("Upload handoff polling error:", error);
      }
    }, 2500);
    return () => window.clearInterval(poll);
  }, [handoffToken]);

  const startHandoff = async () => {
    if (!residentData || isCreatingHandoff) return;
    setIsCreatingHandoff(true);
    try {
      const userId = residentData.userId || residentData.id;
      const response = await fetch("/api/upload-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slot: "documents" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create QR upload.");
      const qrDataUrl = await QRCode.toDataURL(result.uploadUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#071c12", light: "#ffffff" },
      });
      setHandoffToken(result.token);
      setHandoffQrCode(qrDataUrl);
      setHandoffExpiresAt(result.expiresAt);
      setIsHandoffOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create QR upload.");
    } finally {
      setIsCreatingHandoff(false);
    }
  };

  // Initialization
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
        const query = new URLSearchParams(window.location.search);
        const paymentResult = query.get("payment");
        const returnedTransactionId = query.get("transactionId");

        if (paymentResult === "success" && returnedTransactionId) {
          const verification = await reconcileBirthCertificatePayment(returnedTransactionId, userId);
          if (verification.paid) {
            toast.success("Payment verified successfully.");
          } else {
            toast.error("Payment verification failed.");
          }
          window.history.replaceState({}, "", "/modules/civil-registry/birth-certificate-request");
        } else if (paymentResult === "cancelled") {
          toast.error("Payment checkout was cancelled.");
          window.history.replaceState({}, "", "/modules/civil-registry/birth-certificate-request");
        }

        const [res, requestsRes] = await Promise.all([
          getCurrentUserResident(userId),
          getExistingBirthRequests(userId)
        ]);

        if (res.success && res.data) {
          const data = res.data;
          setResidentData(data);
          // Set initial form data
          setFormData(prev => ({
            ...prev,
            certFirstName: data.firstName || "",
            certMiddleName: data.middleName || "",
            certLastName: data.lastName || "",
            certSuffix: data.suffix || "",
            sex: (data.gender || "").toUpperCase(),
            dateOfEvent: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : "",
            placeOfEvent: data.placeOfBirth || "Mapandan, Pangasinan",
            fatherFirstName: data.fatherFirstName || "",
            fatherMiddleName: data.fatherMiddleName || "",
            fatherLastName: data.fatherLastName || "",
            motherFirstName: data.motherFirstName || "",
            motherMiddleName: data.motherMiddleName || "",
            motherLastName: data.motherLastName || "",
            contactNumber: data.contactNumber || "",
            email: data.email || "",
            occupation: data.occupation || "",
          }));
        }

        if (requestsRes.success && requestsRes.data && requestsRes.data.length > 0) {
          setExistingRequests(requestsRes.data);
          const returnedApplication = returnedTransactionId
            ? requestsRes.data.find((app: any) => app.id === returnedTransactionId)
            : null;
          if (returnedApplication) {
            setSelectedApplication(returnedApplication);
            setCurrentStep("SUBMIT");
            return;
          }
          setCurrentStep("EXISTING");
        } else {
          setCurrentStep("GUIDE");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateIdentityStep = () => {
    if (!formData.relation || !formData.contactNumber) {
      toast.warning("Please select relationship and provide your contact number.");
      setShowValidationErrors(true);
      return false;
    }
    return true;
  };

  const validateDetailsStep = () => {
    if (!formData.certFirstName || !formData.certLastName || !formData.dateOfEvent || !formData.placeOfEvent || !formData.sex) {
      toast.warning("Please fill in all required fields (First Name, Last Name, Date of Birth, Place, and Sex).");
      setShowValidationErrors(true);
      return false;
    }
    return true;
  };

  const validateParentsStep = () => {
    if (!formData.motherFirstName || !formData.motherLastName) {
      toast.warning("Mother's Maiden First Name and Last Name are required.");
      setShowValidationErrors(true);
      return false;
    }
    return true;
  };

  const handleNextFromIdentity = () => {
    if (validateIdentityStep()) {
      setShowValidationErrors(false);
      setCurrentStep("DETAILS");
    }
  };

  const handleNextFromDetails = () => {
    if (validateDetailsStep()) {
      setShowValidationErrors(false);
      setCurrentStep("PARENTS");
    }
  };

  const handleNextFromParents = () => {
    if (validateParentsStep()) {
      setShowValidationErrors(false);
      setCurrentStep("UPLOAD");
    }
  };

  const handleNextFromUpload = () => {
    const hasUploadedFile = idChoice === "PROFILE" || idHandoffUrl || formData.newIdFile;
    if (!hasUploadedFile) {
      toast.warning("Please upload your Valid ID copy or choose Profile ID.");
      return;
    }
    setCurrentStep("SIGNATURE");
  };

  const handleSubmitRequest = async () => {
    if (!signatureData) {
      toast.warning("Please provide your digital signature before submitting.");
      return;
    }
    if (!privacyAccepted) {
      toast.warning("You must accept the Data Privacy Terms.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = residentData.userId || residentData.id;
      const data = new FormData();
      data.append("certFirstName", formData.certFirstName);
      data.append("certMiddleName", formData.certMiddleName);
      data.append("certLastName", formData.certLastName);
      data.append("certSuffix", formData.certSuffix);
      data.append("sex", formData.sex);
      data.append("dateOfEvent", formData.dateOfEvent);
      data.append("placeOfEvent", formData.placeOfEvent);
      data.append("fatherFirstName", formData.fatherFirstName);
      data.append("fatherMiddleName", formData.fatherMiddleName);
      data.append("fatherLastName", formData.fatherLastName);
      data.append("motherFirstName", formData.motherFirstName);
      data.append("motherMiddleName", formData.motherMiddleName);
      data.append("motherLastName", formData.motherLastName);
      data.append("relation", formData.relation);
      data.append("contactNumber", formData.contactNumber);
      data.append("email", formData.email);
      data.append("occupation", formData.occupation);
      data.append("privacyConsentAccepted", String(privacyAccepted));

      if (idChoice === "UPLOAD") {
        if (idHandoffUrl) {
          data.append("newIdFile", idHandoffUrl);
        } else if (formData.newIdFile) {
          data.append("newIdFile", formData.newIdFile);
        }
      } else {
        if (residentData.idFrontUrl) {
          data.append("newIdFile", residentData.idFrontUrl);
        }
      }

      const result = await submitBirthCertificateRequest(data, userId);
      if (result.success && result.transactionId) {
        await saveTransactionSignature(result.transactionId, signatureData, userId);

        // Refresh request data
        const updatedRequests = await getExistingBirthRequests(userId);
        if (updatedRequests.success && updatedRequests.data) {
          setExistingRequests(updatedRequests.data);
          const currentTx = updatedRequests.data.find((tx: any) => tx.id === result.transactionId);
          if (currentTx) {
            setSelectedApplication(currentTx);
          }
        }

        toast.success("Birth Certificate request drafted successfully.");
        setCurrentStep("TREASURY");
      } else {
        toast.error(result.error || "Failed to submit request.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCheckoutDetails = async (details: CheckoutDetails) => {
    if (!selectedApplication || !residentData) return false;
    const userId = residentData.userId || residentData.id;
    setIsSubmitting(true);
    try {
      const res = await saveBirthCertificateCheckoutDetails(selectedApplication.id, userId, details);
      return res.success;
    } catch {
      toast.error("An error occurred while preparing secure checkout.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-6">
        <LoaderComponent />
      </div>
    );
  }

  return (
    <div ref={pageScrollRef} className="h-full overflow-y-auto px-4 py-8 md:px-12 md:py-12 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white">

      {/* Title Header */}
      <div className="mx-auto max-w-7xl mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
              BIRTH <span className="text-emerald-500 underline decoration-[6px] md:decoration-8 decoration-emerald-500/20 underline-offset-[6px] md:underline-offset-[12px]">CERTIFICATE</span>
            </h1>
            <p className="text-[9px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">LCR Civil Registry Request Portal</p>
          </div>
          {currentStep === "EXISTING" && (
            <div className="flex gap-4">
              <Button
                onClick={() => router.push("/modules/civil-registry")}
                className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold uppercase tracking-wider rounded-2xl py-6 px-8 border border-white/10 active:scale-95 transition-all text-xs"
              >
                <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back to Hub
              </Button>
              <Button
                onClick={() => {
                  setSelectedApplication(null);
                  setCurrentStep("GUIDE");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-wider rounded-2xl py-6 px-8 shadow-lg shadow-emerald-950/20 active:scale-95 transition-all text-xs"
              >
                New Certified Copy Request
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      {currentStep !== "EXISTING" && (
        <div className="mx-auto max-w-7xl mb-10">
          <div className="grid grid-cols-8 gap-1 md:gap-4 relative px-1 md:px-2">
            {STEPS.map((step, idx) => {
              const currentStepIdx = STEPS.findIndex(s => s.id === currentStep);
              const isActive = currentStep === step.id;
              const isCompleted = idx <= maxStepIdx;
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isCompleted && currentStep !== "SUBMIT") {
                      setCurrentStep(step.id as Step);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                    (!isCompleted || currentStep === "SUBMIT") && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isActive ? "bg-emerald-600 text-white border-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105 md:scale-110" :
                      isCompleted ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                        "bg-slate-200/50 dark:bg-white/5 text-slate-500 border-transparent group-hover:border-emerald-500/30"
                  )}>
                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                  </div>
                  <span className={cn(
                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic font-bold hidden sm:block",
                    isActive ? "text-slate-900 dark:text-white font-black" :
                      isCompleted ? "text-slate-600 dark:text-slate-300" :
                        "text-slate-400 dark:text-slate-500"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Form/Content Wrapper */}
      <div className="mx-auto max-w-7xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative min-h-[500px] flex flex-col text-slate-900 dark:text-white">

        {/* Step: EXISTING (Applications List) */}
        {currentStep === "EXISTING" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Existing <span className="text-emerald-500">Requests</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                We found previous requests for certified birth certificates under your profile.
              </p>
            </div>

            {existingRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem]">
                <FileWarning className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No records found</p>
                <p className="text-slate-500 text-xs mt-1">Submit your first copy request by clicking New Request.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {existingRequests.map((app, idx) => (
                  <div
                    key={app.id || idx}
                    onClick={() => {
                      setSelectedApplication(app);
                      if (app.status === "UNPAID") {
                        setCurrentStep("TREASURY");
                      } else {
                        setCurrentStep("SUBMIT");
                      }
                    }}
                    className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-emerald-500/[0.02] transition-all duration-300 gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-black tracking-tight">{app.birthCertificateRequest?.subjectName || "Birth Certificate Copy"}</span>
                          <Badge className={cn("text-[9px] font-black uppercase py-0.5 px-2 rounded-full",
                            app.status === "PAID" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                            app.status === "UNPAID" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                            app.status === "FOR_REQUESTING" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                            app.status === "RELEASED" && "bg-[#1a6b3a] text-white"
                          )}>
                            {app.status}
                          </Badge>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">
                          Date: {new Date(app.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black mt-0.5">
                          ID: {app.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Request <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: GUIDE */}
        {currentStep === "GUIDE" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Request <span className="text-emerald-500">Guide</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Certified True Copy of Birth Certificate from Municipal Civil Registry Office
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-emerald-400">Requirements Needed</h3>
                </div>
                <ul className="space-y-4 text-sm font-semibold text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>One (1) Valid Government-issued Photo ID of the requestor.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>If requesting for a relative (not direct parent/child), an Authorization Letter is required upon claiming.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Base Government Fee: <span className="text-emerald-400 font-black">₱115.00</span> per certified copy.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-emerald-400">Processing SLA</h3>
                </div>
                <div className="space-y-4 text-slate-300 text-sm font-semibold">
                  <p>Certified true copy processing typically takes <span className="text-emerald-400 font-black">1 to 2 business days</span>.</p>
                  <p>Once evaluated and finalized, you can claim the physical copy at the Municipal Hall, or have it delivered directly to your home within Mapandan (requires delivery fee).</p>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 mt-4 text-xs font-bold text-amber-300 leading-relaxed">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Please ensure that the details match the record in the Local Civil Registry database to prevent retrieval errors.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => {
                  if (existingRequests.length > 0) {
                    setCurrentStep("EXISTING");
                  } else {
                    router.push("/modules/civil-registry");
                  }
                }}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setHasReadGuide(true);
                  setCurrentStep("IDENTITY");
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40"
              >
                Proceed to Details <ChevronRight className="inline-block ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: IDENTITY */}
        {currentStep === "IDENTITY" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Requestor <span className="text-emerald-500">Identity</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Confirm your relationship to the subject and your current contact information.
              </p>
            </div>

            <div className="space-y-6">
              {/* Row 1: Relationship */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Relationship to Subject <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.relation}
                    onValueChange={val => handleFormChange("relation", val)}
                  >
                    <SelectTrigger className="h-12 w-full rounded-xl border border-white/10 bg-[#090c11]/80 px-4 text-sm font-bold text-white outline-none focus-visible:ring-emerald-500/20 focus:border-emerald-500">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {RELATION_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt} className="focus:bg-emerald-600 focus:text-white">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden md:block col-span-2" />
              </div>

              {/* Row 2: Names (Read-Only) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    First Name
                  </Label>
                  <Input
                    value={residentData?.firstName || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Middle Name
                  </Label>
                  <Input
                    value={residentData?.middleName || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Last Name
                  </Label>
                  <Input
                    value={residentData?.lastName || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Suffix
                  </Label>
                  <Input
                    value={residentData?.suffix || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              {/* Row 3: Birth Date, Age, Civil Status, Citizenship (Read-Only) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Birth Date
                  </Label>
                  <Input
                    value={formatBirthDate(residentData?.dateOfBirth)}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Age
                  </Label>
                  <Input
                    value={residentData?.age?.toString() || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Civil Status
                  </Label>
                  <Input
                    value={residentData?.civilStatus || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Citizenship
                  </Label>
                  <Input
                    value={residentData?.citizenship || ""}
                    readOnly
                    className="bg-white/5 border-white/5 text-white font-bold uppercase rounded-xl h-12 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              {/* Row 4: Occupation, Contact Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Occupation
                  </Label>
                  <Input
                    placeholder="Enter occupation"
                    value={formData.occupation}
                    onChange={e => handleFormChange("occupation", e.target.value.toUpperCase())}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-emerald-500/20 uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="Enter active mobile number"
                    value={formData.contactNumber}
                    onChange={e => handleFormChange("contactNumber", e.target.value)}
                    className={cn(
                      "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-emerald-500/20",
                      showValidationErrors && !formData.contactNumber && "border-red-500"
                    )}
                  />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider italic text-amber-500 mt-2 leading-normal">
                    * NOTE: PLEASE USE YOUR ACTIVE CONTACT NUMBER. THIS WILL BE USED TO CONTACT YOU REGARDING YOUR TRANSACTION.
                  </p>
                </div>
              </div>

              {/* Row 5: Email Address (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Email Address (Optional)
                  </Label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={e => handleFormChange("email", e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-emerald-500/20"
                  />
                </div>
                <div className="hidden md:block" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => setCurrentStep("GUIDE")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleNextFromIdentity}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40"
              >
                Subject Details <ChevronRight className="inline-block ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: DETAILS */}
        {currentStep === "DETAILS" && (() => {
          const isSelf = formData.relation === "Self (Aplikante)";
          return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
              <div className="text-center">
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                  Subject <span className="text-emerald-500">Details</span>
                </h2>
                <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                  Provide the exact details of the person whose birth certificate is being requested.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        required
                        placeholder="First Name"
                        value={formData.certFirstName}
                        onChange={e => !isSelf && handleFormChange("certFirstName", e.target.value)}
                        disabled={isSelf}
                        className={cn(
                          "h-12 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/20",
                          showValidationErrors && !formData.certFirstName && "border-red-500",
                          isSelf && "cursor-not-allowed opacity-80"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Middle Name
                      </Label>
                      <Input
                        placeholder="Middle Name"
                        value={formData.certMiddleName}
                        onChange={e => !isSelf && handleFormChange("certMiddleName", e.target.value)}
                        disabled={isSelf}
                        className={cn(
                          "h-12 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/20",
                          isSelf && "cursor-not-allowed opacity-80"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        required
                        placeholder="Last Name"
                        value={formData.certLastName}
                        onChange={e => !isSelf && handleFormChange("certLastName", e.target.value)}
                        disabled={isSelf}
                        className={cn(
                          "h-12 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/20",
                          showValidationErrors && !formData.certLastName && "border-red-500",
                          isSelf && "cursor-not-allowed opacity-80"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Suffix
                      </Label>
                      <Input
                        placeholder="e.g. Jr, Sr"
                        value={formData.certSuffix}
                        onChange={e => !isSelf && handleFormChange("certSuffix", e.target.value)}
                        disabled={isSelf}
                        className={cn(
                          "h-12 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/20",
                          isSelf && "cursor-not-allowed opacity-80"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Gender (Kasarian) <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.sex}
                      onValueChange={val => !isSelf && handleFormChange("sex", val)}
                      disabled={isSelf}
                    >
                      <SelectTrigger className={cn(
                        "h-12 w-full rounded-xl border border-white/10 bg-[#090c11]/80 px-4 text-sm font-bold text-white outline-none focus-visible:ring-emerald-500/20 focus:border-emerald-500",
                        showValidationErrors && !formData.sex && "border-red-500",
                        isSelf && "cursor-not-allowed opacity-80"
                      )}>
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="MALE" className="focus:bg-emerald-600 focus:text-white">Male (Lalake)</SelectItem>
                        <SelectItem value="FEMALE" className="focus:bg-emerald-600 focus:text-white">Female (Babae)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Date of Birth (Araw ng Kapanganakan) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      type="date"
                      value={formData.dateOfEvent}
                      onChange={e => !isSelf && handleFormChange("dateOfEvent", e.target.value)}
                      disabled={isSelf}
                      className={cn(
                        "h-12 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/20 [color-scheme:dark]",
                        showValidationErrors && !formData.dateOfEvent && "border-red-500",
                        isSelf && "cursor-not-allowed opacity-80"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Place of Birth (Lugar ng Kapanganakan) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="e.g. Mapandan, Pangasinan"
                      value={formData.placeOfEvent}
                      onChange={e => !isSelf && handleFormChange("placeOfEvent", e.target.value)}
                      disabled={isSelf}
                      className={cn(
                        "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-emerald-500/20",
                        showValidationErrors && !formData.placeOfEvent && "border-red-500",
                        isSelf && "cursor-not-allowed opacity-80"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 mt-auto">
                <Button
                  type="button"
                  onClick={() => setCurrentStep("IDENTITY")}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextFromDetails}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40"
                >
                  Parents Info <ChevronRight className="inline-block ml-1 w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Step: PARENTS */}
        {currentStep === "PARENTS" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Parents <span className="text-emerald-500">Information</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Provide parents' full names and secondary details for civil registry retrieval.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Father Information */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-2">Father's Full Name (Ama)</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">First Name</Label>
                    <Input
                      placeholder="Father's First Name"
                      value={formData.fatherFirstName}
                      onChange={e => handleFormChange("fatherFirstName", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Middle Name</Label>
                    <Input
                      placeholder="Father's Middle Name"
                      value={formData.fatherMiddleName}
                      onChange={e => handleFormChange("fatherMiddleName", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Last Name</Label>
                  <Input
                    placeholder="Father's Last Name"
                    value={formData.fatherLastName}
                    onChange={e => handleFormChange("fatherLastName", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Mother Information */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-2">Mother's Maiden Name (Ina - Pagkadalaga) <span className="text-red-500">*</span></h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      placeholder="Mother's First Name"
                      value={formData.motherFirstName}
                      onChange={e => handleFormChange("motherFirstName", e.target.value)}
                      className={cn(
                        "h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600",
                        showValidationErrors && !formData.motherFirstName && "border-red-500"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Middle Name</Label>
                    <Input
                      placeholder="Mother's Middle Name"
                      value={formData.motherMiddleName}
                      onChange={e => handleFormChange("motherMiddleName", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="Mother's Last Name"
                    value={formData.motherLastName}
                    onChange={e => handleFormChange("motherLastName", e.target.value)}
                    className={cn(
                      "h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-600",
                      showValidationErrors && !formData.motherLastName && "border-red-500"
                    )}
                  />
                </div>
              </div>
            </div>



            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => setCurrentStep("DETAILS")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleNextFromParents}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40"
              >
                ID Verification <ChevronRight className="inline-block ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: UPLOAD */}
        {currentStep === "UPLOAD" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Requestor <span className="text-emerald-500">ID Verification</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                We need a copy of your valid ID for authentication and security.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mt-6">
              <div className="flex justify-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setIdChoice("PROFILE")}
                  className={cn(
                    "flex-1 py-4 px-6 rounded-2xl border text-center font-bold text-xs uppercase tracking-wider transition-all",
                    idChoice === "PROFILE" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  )}
                >
                  Use Profile ID Copy
                </button>
                <button
                  type="button"
                  onClick={() => setIdChoice("UPLOAD")}
                  className={cn(
                    "flex-1 py-4 px-6 rounded-2xl border text-center font-bold text-xs uppercase tracking-wider transition-all",
                    idChoice === "UPLOAD" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  )}
                >
                  Upload New ID Copy
                </button>
              </div>

              {idChoice === "PROFILE" && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center space-y-6">
                  {residentData?.idFrontUrl ? (
                    <div className="space-y-4">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Valid ID Photo on Profile</p>
                      <div className="relative mx-auto max-w-md aspect-[1.586/1] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <img src={residentData.idFrontUrl} alt="Resident Valid ID" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1">
                        <CheckCircle size={16} /> Verified Profile ID Selected
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 py-6">
                      <FileWarning className="w-12 h-12 text-amber-500 mx-auto" />
                      <p className="text-amber-400 font-bold uppercase tracking-widest text-xs">No Profile ID Found</p>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto">Please choose "Upload New ID Copy" to upload your ID photo.</p>
                    </div>
                  )}
                </div>
              )}

              {idChoice === "UPLOAD" && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Phone QR Upload */}
                    <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] flex flex-col justify-between min-h-[200px]">
                      <div>
                        <QrCode className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Upload from Phone</h4>
                        <p className="text-slate-500 text-[10px] font-semibold mt-1">Scan a QR code to securely upload the ID photo using your phone camera.</p>
                      </div>
                      <Button
                        type="button"
                        onClick={startHandoff}
                        disabled={isCreatingHandoff}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold uppercase tracking-widest text-[9px] rounded-xl mt-4 w-full py-5 border border-emerald-500/20"
                      >
                        {isCreatingHandoff ? "Creating Session..." : "Scan QR Code"}
                      </Button>
                    </div>

                    {/* Desktop Kiosk File Upload */}
                    <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] flex flex-col justify-between min-h-[200px]">
                      <div>
                        <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Direct Upload</h4>
                        <p className="text-slate-500 text-[10px] font-semibold mt-1">Upload directly from this kiosk local filesystem.</p>
                      </div>
                      <div className="relative mt-4">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          id="file-upload"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsUploadingId(true);
                              (async () => {
                                try {
                                  toast.loading("Uploading ID document...", { id: "id-file-upload" });
                                  const userId = residentData?.userId || residentData?.id;
                                  if (!userId) {
                                    throw new Error("User profile not found. Please log in again.");
                                  }
                                  const publicUrl = await uploadFileClientSide(file, "newIdFile", userId);
                                  setIdHandoffUrl(publicUrl);
                                  setIdHandoffFileName(file.name);
                                  handleFormChange("newIdFile", null);
                                  toast.success("ID document uploaded successfully!", { id: "id-file-upload" });
                                } catch (error: any) {
                                  console.error(error);
                                  toast.error(error.message || "Failed to upload ID document.", { id: "id-file-upload" });
                                } finally {
                                  setIsUploadingId(false);
                                }
                              })();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById("file-upload")?.click()}
                          disabled={isUploadingId}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 font-bold uppercase tracking-widest text-[9px] rounded-xl w-full py-5 text-slate-300 disabled:opacity-50"
                        >
                          {isUploadingId ? "Uploading..." : "Select File"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(idHandoffUrl || formData.newIdFile) && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between text-xs font-bold mt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} />
                        <span>Ready: {idHandoffFileName || "Valid ID Uploaded"}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIdHandoffUrl(null);
                          handleFormChange("newIdFile", null);
                          setIdHandoffFileName("");
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-auto p-1 font-bold text-[9px] uppercase tracking-wider"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => setCurrentStep("PARENTS")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleNextFromUpload}
                disabled={isUploadingId}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40 disabled:opacity-50"
              >
                {isUploadingId ? "Uploading..." : <>Proceed to Signature <ChevronRight className="inline-block ml-1 w-4 h-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step: SIGNATURE */}
        {currentStep === "SIGNATURE" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Digital <span className="text-emerald-500">Signature</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Draw or upload your digital signature to acknowledge this request.
              </p>
            </div>

            <div className="max-w-2xl mx-auto mt-6">
              <div className="rounded-2xl overflow-hidden bg-white border border-white/10 text-slate-900 shadow-xl">
                <SignaturePad
                  onSave={dataUrl => {
                    setSignatureData(dataUrl);
                    toast.success("Signature captured successfully.");
                  }}
                />
              </div>

              {signatureData && (
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest">
                  <CheckCircle size={16} /> Signature captured and saved!
                </div>
              )}

              {/* Data Privacy Terms */}
              <div
                onClick={() => setIsPrivacyModalOpen(true)}
                className="mt-6 p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg flex items-center gap-6 cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  privacyAccepted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-white/30 bg-transparent"
                )}>
                  {privacyAccepted && <Check className="w-5 h-5 stroke-[3]" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-wider italic text-slate-200">
                    Data Privacy and Terms Agreement
                  </h3>
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider italic text-slate-400 leading-normal">
                    I authorize the LGU to process my personal information in accordance with the Data Privacy Act. I confirm all info is true and correct. Click to review agreement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => setCurrentStep("UPLOAD")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-950/40 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit to Treasury"} <ChevronRight className="inline-block ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: TREASURY */}
        {currentStep === "TREASURY" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Secure <span className="text-emerald-500">Checkout</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Your request is draft. Please fulfill the processing fee to start LCR review.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 mt-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Request Type</span>
                <span className="text-sm font-black text-white uppercase italic">{formData.certDocType}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Government Fee</span>
                <span className="text-lg font-black text-white">₱115.00</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-xs text-emerald-300 font-semibold leading-relaxed">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Payment is handled securely through authorized Paymongo GCash, QRPH, or Direct Online Banking partners.</span>
              </div>

              <Button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-7 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-950/20 active:scale-95 transition-all mt-4"
              >
                <CreditCard className="inline-block mr-2 w-4 h-4" /> Open Payment Dialog
              </Button>
            </div>

            <div className="flex justify-between items-center pt-8 mt-auto">
              <Button
                type="button"
                onClick={() => setCurrentStep("EXISTING")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Back to List
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep("SUBMIT")}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-8 py-5 text-xs font-black uppercase tracking-widest text-emerald-400"
              >
                Skip to Summary / Check Status <ChevronRight className="inline-block ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: SUBMIT */}
        {currentStep === "SUBMIT" && selectedApplication && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Request <span className="text-emerald-500">Submitted</span>
              </h2>
              <p className="text-slate-400 font-medium italic text-xs md:text-lg uppercase tracking-widest max-w-2xl mx-auto mt-2">
                Your Birth Certificate certified copy request has been logged successfully.
              </p>
            </div>

            {/* Printable Receipt Frame */}
            <div className="max-w-2xl mx-auto bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Users size={160} />
              </div>

              <div className="flex justify-between items-start gap-4 flex-wrap border-b border-white/10 pb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">MUNICIPAL CIVIL REGISTRY</h3>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">Municipality of Mapandan, Pangasinan</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-emerald-500/30">
                    {selectedApplication.status}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 text-sm font-semibold">
                <div className="space-y-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Transaction ID</span>
                    <span className="text-white text-xs font-black">{selectedApplication.id}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Subject Name</span>
                    <span className="text-white uppercase font-black">{selectedApplication.birthCertificateRequest?.subjectName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Date of Birth</span>
                    <span className="text-white font-black">
                      {selectedApplication.birthCertificateRequest?.dateOfEvent
                        ? new Date(selectedApplication.birthCertificateRequest.dateOfEvent).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Fulfillment Strategy</span>
                    <span className="text-white font-black uppercase">{selectedApplication.fulfillmentType || "PICK_UP (Office Claim)"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Total Paid Amount</span>
                    <span className="text-white font-black">₱{selectedApplication.totalAmount?.toFixed(2) || "115.00"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500">Request Purpose</span>
                    <span className="text-white font-bold">{selectedApplication.additionalData?.purpose || "Personal Use"}</span>
                  </div>
                </div>
              </div>

              {selectedApplication.status === "PAID" && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-xs text-emerald-300 font-semibold leading-relaxed">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>Your payment has been successfully recorded. Civil registry staff will retrieve the certified copy. You will receive notification for pickup/delivery once ready.</span>
                </div>
              )}

              {selectedApplication.status === "UNPAID" && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-xs text-amber-300 font-semibold leading-relaxed">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>This request is drafted but unpaid. Please click checkout below to proceed with the payment.</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-8">
              <Button
                type="button"
                onClick={() => setCurrentStep("EXISTING")}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Back to List
              </Button>
              <Button
                type="button"
                onClick={handlePrintReceipt}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-2"
              >
                <Printer size={16} /> Print Receipt
              </Button>
              {selectedApplication.status === "UNPAID" && (
                <Button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-5 text-xs font-black uppercase tracking-widest text-white shadow-lg"
                >
                  Proceed to Payment
                </Button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Secure Handoff QR Code Dialog */}
      <Dialog open={isHandoffOpen} onOpenChange={setIsHandoffOpen}>
        <DialogContent className="max-w-md bg-[#090c11] border-white/10 text-white rounded-[2rem] p-8 text-center shadow-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Mobile Document Handoff</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Mobile Handoff</p>
              <h3 className="text-xl font-black uppercase tracking-tighter mt-1">Scan to Upload ID</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">Scan this QR code with your phone to open the file uploader and attach your ID photo directly.</p>
            </div>

            {handoffQrCode ? (
              <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl mx-auto">
                <img src={handoffQrCode} alt="Handoff QR Code" className="w-64 h-64 mx-auto" />
              </div>
            ) : (
              <div className="w-64 h-64 rounded-3xl bg-white/5 flex items-center justify-center animate-pulse mx-auto">
                <QrCode size={48} className="text-slate-600" />
              </div>
            )}

            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Awaiting file upload...
            </div>

            <Button
              type="button"
              onClick={() => setIsHandoffOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl py-4"
            >
              Cancel Handoff
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {selectedApplication && (
        <PaymentModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          amount={selectedApplication.totalAmount || 115}
          transactionId={selectedApplication.id}
          deliveryFee={50}
          onBeforeCheckout={handleSaveCheckoutDetails}
        />
      )}

      {/* Privacy Modal */}
      <PrivacyTermsModal
        isOpen={isPrivacyModalOpen}
        themeColor="#10b981"
        onClose={() => setIsPrivacyModalOpen(false)}
        onAccept={() => {
          setPrivacyAccepted(true);
          setIsPrivacyModalOpen(false);
        }}
      />

    </div>
  );
}

const LoaderComponent = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-12">
    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Initializing Portal</p>
  </div>
);

const SignaturePad = ({ onSave }: { onSave: (dataUrl: string) => void }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isUploadedSignature, setIsUploadedSignature] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isUploadedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offsetX, offsetY;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isUploadedSignature || !isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offsetX, offsetY;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsUploadedSignature(false);
  };

  const handleSave = () => {
    if (isUploadedSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height,
          centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        setIsUploadedSignature(true);
        onSave(canvas.toDataURL('image/png'));
      }
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={250}
        className={cn(
          "w-full h-[250px] cursor-crosshair touch-none transition-all",
          isUploadedSignature && "pointer-events-none opacity-80"
        )}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="p-4 bg-slate-50 dark:bg-black/40 w-full flex justify-center gap-4 border-t border-slate-200 dark:border-white/10 flex-wrap">
        <button type="button" onClick={clearCanvas} className="px-6 py-2 rounded-full border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          Clear
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-2 rounded-full border border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
          <UploadCloud className="w-4 h-4" />
          Upload E-Signature
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          onClick={handleSave}
          disabled={isUploadedSignature}
          className={cn(
            "px-6 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 shadow-md hover:bg-emerald-600 transition-colors",
            isUploadedSignature && "opacity-50 cursor-not-allowed"
          )}
        >
          Save Signature
        </button>
      </div>
    </div>
  );
}
