"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Check,
  Home,
  Sparkles,
  Calendar,
  TrendingUp,
  ShieldAlert,
  Upload,
  Eye,
  Building2,
  ChevronDown,
  X,
  Clock,
  Printer,
  ArrowLeft,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { compressImage } from "@/lib/image-compression";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { submitBusinessAppointment } from "./actions";
import PrintQueueTicket from "@/components/shared/PrintQueueTicket";

import SecureIdleTimer from "@/components/shared/SecureIdleTimer";

function FilePreview({ file, onClick }: { file: File; onClick?: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  if (file.type.startsWith("image/")) {
    if (!previewUrl) return null;
    return (
      <div
        onClick={onClick}
        className="relative w-full h-36 rounded-xl overflow-hidden mt-3 border border-slate-100 dark:border-white/10 shadow-inner bg-slate-50 dark:bg-black/25 flex items-center justify-center group/preview animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Document Preview"
          className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="text-[10px] text-white font-black uppercase tracking-widest bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 hover:bg-black/80 transition-colors">
            <Eye className="w-3.5 h-3.5" />
            Click to View
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="w-full py-4 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 mt-3 flex items-center justify-between gap-2.5 animate-in fade-in duration-200 cursor-pointer group/pdf hover:border-theme-primary/25 transition-all"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs font-mono shrink-0">
          PDF
        </div>
        <div className="truncate text-left">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate font-mono">{file.name}</span>
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Document File</span>
        </div>
      </div>
      <Eye className="w-4 h-4 text-slate-400 group-hover/pdf:text-theme-primary transition-colors shrink-0 mr-1" />
    </div>
  );
}

const MAPANDAN_BARANGAYS = [
  "Amanoaoac", "Apaya", "Aserda", "Baloling", "Coral", "Golden", "Lanas",
  "Nilombot", "Patland", "Pias", "Poblacion", "Primicias", "Santa Maria", "Torres", "Valenzuela"
];

const LINE_OF_BUSINESS_OPTIONS = [
  "Agriculture & Forestry", "Manufacturing", "Wholesale & Retail", "Food & Beverage Services",
  "IT & Computer Services", "Construction", "Real Estate", "Transportation & Storage",
  "Healthcare & Social", "Education"
];

type Step = "PATHWAY" | "PROFILE" | "SCHEDULE" | "CHECKLIST" | "SUBMIT" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "PATHWAY", label: "Status", icon: Sparkles },
  { id: "PROFILE", label: "Business", icon: Building2 },
  { id: "SCHEDULE", label: "Schedule", icon: Calendar },
  { id: "CHECKLIST", label: "Documents", icon: Upload },
  { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

interface BusinessPermitAppointmentClientProps {
  resident: any;
  permitTypes: any[];
  config: {
    maxSlots: number;
    maxSlotsAM?: number;
    maxSlotsPM?: number;
    blockedDates: string[];
    activeDays: number[];
  };
  bookedSlots: { appointmentDate: Date; appointmentSlot: string }[];
  hasActivePermit: boolean;
  previousPermits: any[];
}

export function BusinessPermitAppointmentClient({
  resident,
  permitTypes,
  config,
  bookedSlots,
  hasActivePermit,
  previousPermits
}: BusinessPermitAppointmentClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("PATHWAY");
  const [submitting, setSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState<"NEW" | "RENEWAL">("NEW");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isPriorityLane, setIsPriorityLane] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedPermitIndex, setSelectedPermitIndex] = useState(0);
  const [isOtherLine, setIsOtherLine] = useState(false);

  const [newTransactionId, setNewTransactionId] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);
  const [printTriggered, setPrintTriggered] = useState(false);

  const themeColor = "#3B82F6"; // Blue
  const branding = {
    logo: "/logo.png",
    word1: "MUNICIPALITY",
    word2: "PORTAL"
  };

  // Form State
  const [formState, setFormState] = useState({
    businessName: "",
    tradeName: "",
    orgType: "SOLE_PROPRIETORSHIP",
    dtiSecNumber: "",
    permitNumber: "",
    lineOfBusiness: "",
    barangay: "",
    street: "",
    building: "",
    capitalInvestment: "",
    grossSales: "",
    employeeCount: "0",
    businessArea: "",
    tinNumber: "",
    philhealthNumber: "",
    pagibigNumber: "",
    sssNumber: "",
    businessBranch: "MAIN",
    registrationType: "DTI",
    dtiSecDate: ""
  });

  const residentState = {
    firstName: resident?.firstName || "",
    lastName: resident?.lastName || "",
    middleName: resident?.middleName || "",
    suffix: resident?.suffix || "",
    gender: resident?.gender || "Male",
    dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split("T")[0] : "",
    civilStatus: resident?.civilStatus || "Single",
    citizenship: resident?.citizenship || "Filipino",
    houseNumber: resident?.houseNumber || "",
    street: resident?.street || "",
    barangay: resident?.barangay || "",
    municipality: resident?.municipality || "Mapandan",
    province: resident?.province || "Pangasinan",
    contactNumber: resident?.contactNumber || "",
    email: resident?.email || "",
    occupation: resident?.occupation || ""
  };

  const handleInputChange = (field: string, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleLineOfBusinessSelect = (val: string) => {
    if (val === "Other") {
      setIsOtherLine(true);
      handleInputChange("lineOfBusiness", "");
    } else {
      setIsOtherLine(false);
      handleInputChange("lineOfBusiness", val);
    }
  };

  const handleSelectPreviousPermit = () => {
    const targetPermit = previousPermits[selectedPermitIndex];
    if (!targetPermit) return;
    const addData = targetPermit.additionalData || {};

    setFormState(prev => ({
      ...prev,
      businessName: addData.businessName || "",
      tradeName: addData.tradeName || "",
      orgType: addData.orgType || "SOLE_PROPRIETORSHIP",
      dtiSecNumber: addData.dtiSecNumber || "",
      permitNumber: targetPermit.businessPermit?.permitNumber || addData.permitNumber || targetPermit.id.slice(-8).toUpperCase(),
      lineOfBusiness: addData.lineOfBusiness || "",
      barangay: addData.barangay || prev.barangay,
      street: addData.street || "",
      building: addData.building || "",
      employeeCount: addData.employeeCount ? addData.employeeCount.toString() : "0",
      businessArea: addData.businessArea ? addData.businessArea.toString() : "",
      tinNumber: addData.tinNumber || "",
      philhealthNumber: addData.philhealthNumber || "",
      pagibigNumber: addData.pagibigNumber || "",
      sssNumber: addData.sssNumber || "",
      businessBranch: addData.businessBranch === "BRANCH" ? "BRANCH" : "MAIN",
      registrationType: addData.registrationType === "SEC" ? "SEC" : addData.registrationType === "COA" ? "COA" : "DTI",
      dtiSecDate: addData.dtiSecDate || "",
    }));

    setShowRenewalModal(false);
    toast.success(`Business details auto-filled for ${addData.businessName || "selected business"}!`);
  };

  const handleDeclinePreviousPermit = () => {
    setShowRenewalModal(false);
  };

  // Appointment Schedule State
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Document Files
  const [idFile, setIdFile] = useState<File | null>(null);
  const [ctcFile, setCtcFile] = useState<File | null>(null);
  const [dtiSecFile, setDtiSecFile] = useState<File | null>(null);
  const [brgyClearanceFile, setBrgyClearanceFile] = useState<File | null>(null);
  const [sanitaryPermitFile, setSanitaryPermitFile] = useState<File | null>(null);
  const [fireSafetyFile, setFireSafetyFile] = useState<File | null>(null);
  const [previousPermitFile, setPreviousPermitFile] = useState<File | null>(null);
  const [birCorFile, setBirCorFile] = useState<File | null>(null);
  const [locationPhotoFile, setLocationPhotoFile] = useState<File | null>(null);

  const [existingIdUrl] = useState<string | null>(resident?.idFrontUrl || null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Document Viewers
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<File | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");

  const handleViewFile = (file: File | null, url: string | null, title: string) => {
    setViewerFile(file);
    setViewerUrl(url);
    setViewerTitle(title);
    setViewerOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setter(null);
      return;
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || "";
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.");
      e.target.value = "";
      return;
    }

    // Validate magic bytes (headers) on the client-side
    try {
      const headBuffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      let hex = "";
      for (let i = 0; i < headBuffer.length; i++) {
        hex += headBuffer[i].toString(16).padStart(2, "0");
      }
      hex = hex.toUpperCase();

      let isMagicValid = false;
      const mime = file.type.toLowerCase();

      if (hex.startsWith("FFD8FF") && (mime === "image/jpeg" || mime === "image/jpg")) {
        isMagicValid = true;
      } else if (hex.startsWith("89504E470D0A1A0A") && mime === "image/png") {
        isMagicValid = true;
      } else if (hex.startsWith("25504446") && mime === "application/pdf") {
        isMagicValid = true;
      } else if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250" && mime === "image/webp") {
        isMagicValid = true;
      }

      if (!isMagicValid) {
        toast.error("Security alert: File header mismatch! The actual file content does not match its extension.");
        e.target.value = "";
        return;
      }
    } catch (err) {
      console.error("Client-side file headers verification error:", err);
      toast.error("Failed to verify file security headers.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      e.target.value = "";
      return;
    }

    if (file.type.startsWith("image/")) {
      try {
        const compressed = await compressImage(file);
        setter(compressed);
      } catch (err) {
        console.error("Compression error:", err);
        setter(file);
      }
    } else {
      setter(file);
    }
  };

  const isStepValid = (step: Step): boolean => {
    if (step === "PATHWAY") {
      return !hasActivePermit;
    }
    if (step === "PROFILE") {
      const hasCapital = businessType === "NEW" ? !!formState.capitalInvestment : !!formState.grossSales;
      const hasRegistration = businessType === "NEW" ? (!!formState.registrationType && !!formState.dtiSecNumber && !!formState.dtiSecDate) : !!formState.permitNumber;
      return !!formState.businessName && !!formState.lineOfBusiness && !!formState.barangay && hasCapital && !!formState.businessBranch && !!formState.tinNumber && hasRegistration;
    }
    if (step === "CHECKLIST") {
      return true;
    }
    if (step === "SCHEDULE") {
      return !!selectedDate && !!selectedSlot;
    }
    if (step === "SUBMIT") {
      return privacyAccepted;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      setShowValidationErrors(true);
      toast.error("Please fill in all required fields to proceed.");
      return;
    }
    setShowValidationErrors(false);

    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  };

  const handleBack = () => {
    setShowValidationErrors(false);
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].id);
    }
  };

  const handleSubmit = async () => {
    const userId = resident?.userId || resident?.id;
    if (!userId) {
      toast.error("Missing session user identifier.");
      return;
    }

    setSubmitting(true);
    try {
      const targetType = permitTypes.find(t => t.code === (businessType === "NEW" ? "BUSINESS_PERMIT_NEW" : "BUSINESS_PERMIT_RENEW"));
      if (!targetType) {
        toast.error("Invalid transaction type configuration.");
        setSubmitting(false);
        return;
      }

      const formDataPayload = new FormData();
      formDataPayload.append("typeId", targetType.id);
      formDataPayload.append("appointmentDate", selectedDate);
      formDataPayload.append("appointmentSlot", selectedSlot);
      formDataPayload.append("residentSnapshot", JSON.stringify(residentState));

      const addData = {
        ...formState,
        businessType,
        isPriorityLane,
        capitalInvestment: parseFloat(formState.capitalInvestment.replace(/,/g, "")) || 0,
        grossSales: parseFloat(formState.grossSales.replace(/,/g, "")) || 0,
      };
      formDataPayload.append("additionalData", JSON.stringify(addData));

      if (idFile) formDataPayload.append("idFile", idFile);
      if (ctcFile) formDataPayload.append("ctcFile", ctcFile);
      if (dtiSecFile) formDataPayload.append("dtiSecFile", dtiSecFile);
      if (brgyClearanceFile) formDataPayload.append("brgyClearanceFile", brgyClearanceFile);
      if (sanitaryPermitFile) formDataPayload.append("sanitaryPermitFile", sanitaryPermitFile);
      if (fireSafetyFile) formDataPayload.append("fireSafetyFile", fireSafetyFile);
      if (previousPermitFile) formDataPayload.append("previousPermitFile", previousPermitFile);
      if (birCorFile) formDataPayload.append("birCorFile", birCorFile);
      if (locationPhotoFile) formDataPayload.append("locationPhotoFile", locationPhotoFile);

      if (existingIdUrl) formDataPayload.append("existingIdUrl", existingIdUrl);

      const res = await submitBusinessAppointment(formDataPayload, userId);
      if (res.success && res.data) {
        toast.success("Business Permit Appointment booked successfully!");
        setNewTransactionId(res.data.id);
        setQueueNumber(res.data.queueNumber);
        setCurrentStep("SUCCESS");
      } else {
        toast.error(res.error || "Failed to submit booking");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const printSlip = () => {
    setPrintTriggered(true);
  };

  const activePermitTypeObj = permitTypes.find(t => t.code === (businessType === "NEW" ? "BUSINESS_PERMIT_NEW" : "BUSINESS_PERMIT_RENEW"));
  let docs: string[] = [];
  if (activePermitTypeObj) {
    if (Array.isArray(activePermitTypeObj.requiredDocs)) {
      docs = activePermitTypeObj.requiredDocs as string[];
    } else if (typeof activePermitTypeObj.requiredDocs === "string") {
      try {
        docs = JSON.parse(activePermitTypeObj.requiredDocs);
      } catch {
        docs = [];
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-[#050816] transition-colors duration-300 font-sans select-none overflow-y-auto overscroll-y-contain pb-32">
      <SecureIdleTimer />


      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full space-y-8 relative">
        <PrivacyTermsModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
          onAccept={() => {
            setPrivacyAccepted(true);
            setIsPrivacyModalOpen(false);
          }}
          themeColor={themeColor}
        />

        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          file={viewerFile}
          fileUrl={viewerUrl}
          title={viewerTitle}
        />

        {/* Progress Stepper */}
        {currentStep !== "SUCCESS" && (
          <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
            {STEPS.map((step, idx) => {
              const isActive = STEPS.findIndex(s => s.id === currentStep) === idx;
              const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;
              const Icon = step.icon;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 relative z-10 font-black cursor-pointer group">
                  <div className={cn(
                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isActive ? "bg-theme-primary text-white border-theme-primary shadow-lg scale-105" :
                      isCompleted ? "bg-theme-primary/10 text-theme-primary border-theme-primary/30" :
                        "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-theme-primary/30"
                  )}
                    style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : isCompleted ? { color: themeColor, borderColor: `${themeColor}33`, backgroundColor: `${themeColor}1a` } : {}}
                  >
                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                  </div>
                  <span className={cn(
                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                    isActive ? "text-theme-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                  )} style={isActive ? { color: themeColor } : {}}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Content Box */}
        <div className="bg-white dark:bg-[#0c1120] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 md:p-12 shadow-xl relative min-h-[400px] flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {currentStep === "PATHWAY" && (
                <motion.div
                  key="pathway"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter pt-2">
                      Choose Application <span style={{ color: themeColor }}>Pathway</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic text-xs uppercase tracking-widest max-w-2xl mx-auto">
                      Select your current business permit status to proceed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {[
                      {
                        id: "NEW",
                        label: "Business Permit - New",
                        desc: "Apply for a new business permit for starting a business in Mapandan.",
                        icon: Sparkles
                      },
                      {
                        id: "RENEWAL",
                        label: "Business Permit - Renewal",
                        desc: "Renew your existing business permit. Autofilled based on previous records.",
                        icon: TrendingUp
                      }
                    ].map(opt => {
                      const isSelected = businessType === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setBusinessType(opt.id as any);
                            if (opt.id === "RENEWAL" && previousPermits.length > 0) {
                              setShowRenewalModal(true);
                            }
                          }}
                          className={cn(
                            "p-6 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-350 min-h-[180px] flex flex-col justify-between cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-lg scale-[1.01]"
                              : "border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-theme-primary/30"
                          )}
                          style={isSelected ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                              isSelected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                            )} style={isSelected ? { color: themeColor, backgroundColor: `${themeColor}1a` } : {}}>
                              <Icon className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md animate-in zoom-in-50" style={{ backgroundColor: themeColor }}>
                                <Check className="w-3 h-3 text-white stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 mt-4">
                            <h4 className={cn(
                              "text-base font-black uppercase italic tracking-wider leading-tight",
                              isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                            )}>
                              {opt.label.toUpperCase()}
                            </h4>
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-wider leading-relaxed",
                              isSelected ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                            )}>
                              {opt.desc.toUpperCase()}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {currentStep === "PROFILE" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Business Details</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provide legal and financial registration metrics</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Business Name <span className="text-rose-500">*</span></Label>
                      <Input
                        type="text"
                        value={formState.businessName}
                        onChange={e => handleInputChange("businessName", e.target.value)}
                        placeholder="Official registered name"
                        className="rounded-xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Organization Type <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <select
                          value={formState.orgType}
                          onChange={e => handleInputChange("orgType", e.target.value)}
                          className="w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                          <option value="PARTNERSHIP">Partnership</option>
                          <option value="CORPORATION">Corporation</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Barangay Location <span className="text-rose-500">*</span></Label>
                      <div className="relative">
                        <select
                          value={formState.barangay}
                          onChange={e => handleInputChange("barangay", e.target.value)}
                          className="w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>Select Barangay...</option>
                          {MAPANDAN_BARANGAYS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Line of Business <span className="text-rose-500">*</span></Label>
                      {!isOtherLine ? (
                        <div className="relative">
                          <select
                            value={formState.lineOfBusiness || ""}
                            onChange={e => handleLineOfBusinessSelect(e.target.value)}
                            className="w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            <option value="" disabled>Select Line of Business...</option>
                            {LINE_OF_BUSINESS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            <option value="Other">Other...</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type="text"
                            value={formState.lineOfBusiness}
                            onChange={e => handleInputChange("lineOfBusiness", e.target.value)}
                            placeholder="Enter custom business type"
                            className="rounded-xl h-12 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsOtherLine(false);
                              handleInputChange("lineOfBusiness", "");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-650"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {businessType === "NEW" ? (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Initial Capitalization (₱) <span className="text-rose-500">*</span></Label>
                        <Input
                          type="text"
                          value={formState.capitalInvestment}
                          onChange={e => handleInputChange("capitalInvestment", e.target.value.replace(/[^0-9.,]/g, ""))}
                          placeholder="e.g. 150,000"
                          className="rounded-xl h-12"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Annual Gross Sales (₱) <span className="text-rose-500">*</span></Label>
                        <Input
                          type="text"
                          value={formState.grossSales}
                          onChange={e => handleInputChange("grossSales", e.target.value.replace(/[^0-9.,]/g, ""))}
                          placeholder="e.g. 500,000"
                          className="rounded-xl h-12"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">TIN Number <span className="text-rose-500">*</span></Label>
                      <Input
                        type="text"
                        value={formState.tinNumber}
                        onChange={e => handleInputChange("tinNumber", e.target.value)}
                        placeholder="e.g. 123-456-789-000"
                        className="rounded-xl h-12"
                      />
                    </div>

                    {businessType === "NEW" ? (
                      <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Registration <span className="text-rose-500">*</span></Label>
                          <div className="relative">
                            <select
                              value={formState.registrationType}
                              onChange={e => handleInputChange("registrationType", e.target.value)}
                              className="w-full appearance-none rounded-xl h-12 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d12]/50 px-4 pr-10 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                            >
                              <option value="DTI">DTI</option>
                              <option value="SEC">SEC</option>
                              <option value="COA">COA</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Number <span className="text-rose-500">*</span></Label>
                          <Input
                            type="text"
                            value={formState.dtiSecNumber}
                            onChange={e => handleInputChange("dtiSecNumber", e.target.value)}
                            placeholder="Cert No."
                            className="rounded-xl h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Date <span className="text-rose-500">*</span></Label>
                          <Input
                            type="date"
                            value={formState.dtiSecDate}
                            onChange={e => handleInputChange("dtiSecDate", e.target.value)}
                            className="rounded-xl h-12"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">Permit Number <span className="text-rose-500">*</span></Label>
                        <Input
                          type="text"
                          value={formState.permitNumber}
                          onChange={e => handleInputChange("permitNumber", e.target.value)}
                          placeholder="BP-2025-XXXXX"
                          className="rounded-xl h-12"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === "SCHEDULE" && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">Choose Appointment Schedule</h3>
                    <p className="text-[10px] text-slate-400 italic">Select an available date and shift slot for BPLO validation counter.</p>
                  </div>

                  <SchedulePicker
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    bookedSlots={bookedSlots}
                    config={config}
                    themeColor={themeColor}
                  />
                </motion.div>
              )}

              {currentStep === "CHECKLIST" && (
                <motion.div
                  key="checklist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Document Checklists</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verify requirements to facilitate processing</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {((businessType === "NEW"
                      ? [
                        { label: "1. Owner's Valid ID", field: "idFile", file: idFile, setter: setIdFile, existingUrl: existingIdUrl, optional: true },
                        { label: "2. Barangay Clearance", field: "brgyClearanceFile", file: brgyClearanceFile, setter: setBrgyClearanceFile, optional: true },
                        { label: "3. DTI / SEC Registration Certificate", field: "dtiSecFile", file: dtiSecFile, setter: setDtiSecFile, optional: true },
                        { label: "4. CTC (Cedula)", field: "ctcFile", file: ctcFile, setter: setCtcFile, optional: true },
                        { label: "5. Location Photo of Business", field: "locationPhotoFile", file: locationPhotoFile, setter: setLocationPhotoFile, optional: true }
                      ]
                      : [
                        { label: "1. Owner's Valid ID", field: "idFile", file: idFile, setter: setIdFile, existingUrl: existingIdUrl, optional: true },
                        { label: "2. CTC (Cedula)", field: "ctcFile", file: ctcFile, setter: setCtcFile, optional: true },
                        { label: "3. Previous Business Permit License", field: "previousPermitFile", file: previousPermitFile, setter: setPreviousPermitFile, optional: true }
                      ]
                    ) as any[]).map(item => {
                      const hasFile = !!item.file || !!item.existingUrl;
                      return (
                        <div key={item.field} className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 italic">{item.label}</Label>

                          <div className={cn(
                            "p-4 rounded-3xl border border-dashed flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:border-primary/45",
                            hasFile ? "border-primary dark:border-primary/30" : "border-slate-200 dark:border-white/10"
                          )}>
                            <div className="flex items-center gap-3.5 w-full text-left">
                              <div className="w-10 h-10 border rounded-xl flex items-center justify-center text-primary shrink-0 bg-slate-50/50" style={{ color: themeColor }}>
                                <Upload className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white italic truncate pr-2">
                                  {item.label.replace(/^\d+\.\s*/, "")}
                                </h4>
                                <p className="text-[8px] text-slate-400 font-bold italic uppercase tracking-tighter">
                                  {item.file ? `Uploaded (${(item.file.size / 1024).toFixed(1)} KB)` : item.existingUrl ? "Preloaded from Profile" : "PDF / IMAGE (MAX 5MB)"}
                                </p>
                              </div>
                            </div>

                            {item.file ? (
                              <FilePreview file={item.file} onClick={() => handleViewFile(item.file, null, item.label)} />
                            ) : item.existingUrl ? (
                              <div
                                onClick={() => handleViewFile(null, item.existingUrl!, item.label)}
                                className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-black/30 h-24 flex items-center justify-center group/preview cursor-pointer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.existingUrl}
                                  alt="Preloaded Document"
                                  className="object-cover w-full h-full group-hover/preview:scale-105 transition-all"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[9px] text-white font-black uppercase tracking-widest">🔍 VIEW FULL SIZE</span>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between w-full mt-1">
                              <input
                                type="file"
                                onChange={(e) => handleFileChange(e, item.setter)}
                                className="hidden"
                                id={`upload-${item.field}`}
                                accept=".pdf,.png,.jpg,.jpeg"
                              />
                              {hasFile ? (
                                <div className="flex gap-2 w-full">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById(`upload-${item.field}`)?.click()}
                                    className="flex-1 font-black italic uppercase tracking-widest text-[9px] h-10 rounded-2xl border-slate-200 text-slate-700 bg-transparent"
                                  >
                                    Change File
                                  </Button>
                                  {!(item.field === "idFile" && item.existingUrl && !item.file) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => item.setter(null)}
                                      className="flex-1 font-black italic uppercase tracking-widest text-[9px] h-10 rounded-2xl border-rose-200 text-rose-500 bg-transparent"
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  onClick={() => document.getElementById(`upload-${item.field}`)?.click()}
                                  className="font-black italic uppercase tracking-widest text-[9px] h-10 w-full rounded-2xl text-white"
                                  style={{ backgroundColor: themeColor }}
                                >
                                  Upload
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {currentStep === "SUBMIT" && (
                <motion.div
                  key="submit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 dark:text-white">Review Appointment Parameters</h3>
                    <p className="text-[10px] text-slate-400 italic">Verify all information before submitting to the queue.</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-6 rounded-2xl space-y-4 text-xs leading-relaxed">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Business Name</span>
                        <p className="font-black text-slate-900 dark:text-white uppercase">{formState.businessName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Filing Route</span>
                        <p className="font-black uppercase text-slate-900 dark:text-white">{businessType === "NEW" ? "New Business License" : "Renewal Submission"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Appointment Date</span>
                        <p className="font-black text-slate-900 dark:text-white">{selectedDate}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Time Session</span>
                        <p className="font-black text-slate-900 dark:text-white">{selectedSlot}</p>
                      </div>
                    </div>
                  </div>

                  {/* Priority Lane */}
                  <div
                    onClick={() => setIsPriorityLane(!isPriorityLane)}
                    className="p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none bg-slate-50 dark:bg-white/[0.02]"
                    style={isPriorityLane ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                      isPriorityLane ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-white/10"
                    )} style={isPriorityLane ? { backgroundColor: themeColor, borderColor: themeColor } : {}}>
                      {isPriorityLane && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">♿ REQUEST PRIORITY LANE SERVICE</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">For Senior Citizens, PWDs, or Pregnant applicants.</p>
                    </div>
                  </div>

                  {/* Privacy Agreement */}
                  <div
                    onClick={() => {
                      if (privacyAccepted) {
                        setPrivacyAccepted(false);
                      } else {
                        setIsPrivacyModalOpen(true);
                      }
                    }}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 select-none",
                      privacyAccepted ? "bg-theme-primary/5 border-theme-primary" : "bg-slate-50 dark:bg-white/[0.02] border-transparent"
                    )}
                    style={privacyAccepted ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                      privacyAccepted ? "bg-theme-primary border-theme-primary text-white" : "border-slate-300 dark:border-white/10"
                    )} style={privacyAccepted ? { backgroundColor: themeColor, borderColor: themeColor } : {}}>
                      {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">I confirm that all provided details are correct and compliant.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === "SUCCESS" && (
                <div className="space-y-8 text-center py-6">
                  {queueNumber && (
                    <PrintQueueTicket
                      queueNumber={queueNumber}
                      residentName={`${residentState.firstName} ${residentState.lastName}`}
                      serviceName={activePermitTypeObj?.name || "Business Permit Appointment"}
                      appointmentDate={selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                      appointmentSlot={selectedSlot}
                      isPriority={isPriorityLane}
                      branding={branding}
                      themeColor={themeColor}
                      triggerPrint={printTriggered}
                      onPrintCompleted={() => setPrintTriggered(false)}
                    />
                  )}

                  <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-300" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Appointment Scheduled!</h2>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Your slot has been successfully registered in the system</p>
                  </div>

                  <div className="max-w-md mx-auto border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 bg-slate-50 dark:bg-black/10 text-left space-y-5">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-100 dark:border-white/5">
                      <span>Queue ticket details</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">#{(newTransactionId || "").slice(-8).toUpperCase()}</span>
                    </div>

                    {queueNumber && (
                      <div className="border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl p-5 bg-white dark:bg-[#1a1f2c]/50 flex flex-col items-center justify-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your queue number</span>
                        <span className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-mono">
                          {queueNumber}
                        </span>

                        {isPriorityLane && (
                          <span className="bg-theme-primary/10 text-theme-primary border border-theme-primary/20 rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor, borderColor: `${themeColor}33`, backgroundColor: `${themeColor}1a` }}>
                            ♿ Priority Lane
                          </span>
                        )}

                        <div className="w-full flex items-center justify-center mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${queueNumber}`}
                            alt="QR Ticket Code"
                            className="w-24 h-24 p-2 bg-white rounded-xl border border-slate-100"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 text-xs pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Business Name:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{formState.businessName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Scheduled Date:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Time Session:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{selectedSlot}</span>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-450 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-theme-primary" style={{ color: themeColor }} /> Requirements checklist:
                      </h4>
                      {docs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No specific documents required.</p>
                      ) : (
                        <ul className="text-xs font-semibold space-y-1.5 pl-5 list-disc text-slate-500 dark:text-slate-400 leading-relaxed">
                          {docs.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
                    <Button onClick={printSlip} variant="outline" className="font-bold uppercase tracking-widest text-xs px-6 py-5 rounded-2xl w-full sm:w-auto">
                      <Printer className="w-4 h-4 mr-2" /> Print Ticket
                    </Button>
                    <Link href="/dashboard/appointment" className="w-full sm:w-auto">
                      <Button className="text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl hover:opacity-90 transition-all w-full text-white" style={{ backgroundColor: themeColor }}>
                        <Home className="w-4 h-4 mr-2" /> Finish & Exit
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
            {currentStep !== "SUCCESS" && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (currentStep === "PATHWAY") {
                      router.push("/dashboard");
                    } else {
                      handleBack();
                    }
                  }}
                  className="rounded-full px-8 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest italic text-[10px] h-10 md:h-14 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 inline" /> Back
                </Button>

                <Button
                  onClick={currentStep === "SUBMIT" ? handleSubmit : handleNext}
                  disabled={submitting || (currentStep === "SUBMIT" && !privacyAccepted)}
                  className="text-white text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 font-black uppercase tracking-widest italic"
                  style={{ backgroundColor: themeColor }}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {currentStep === "SUBMIT" ? "Book Appointment" : "Next Phase"}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </div>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Renewal Quick modal */}
      <AnimatePresence>
        {showRenewalModal && previousPermits.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl p-6 md:p-8 max-w-lg w-full space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0" style={{ color: themeColor, backgroundColor: `${themeColor}1a` }}>
                  <Building2 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary italic" style={{ color: themeColor }}>Record Detected</span>
                  <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                    Renew Previous Business?
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide italic">
                    We found your last successful business permit record!
                  </p>
                </div>
              </div>

              {previousPermits.length === 1 ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Business Name</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white uppercase italic truncate block">
                        {previousPermits[0].additionalData?.businessName || "N/A"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Trade Name</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase italic truncate block">
                        {previousPermits[0].additionalData?.tradeName || "N/A"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Permit License No.</span>
                      <span className="text-xs font-mono font-bold text-primary block" style={{ color: themeColor }}>
                        {previousPermits[0].businessPermit?.permitNumber || previousPermits[0].additionalData?.permitNumber || previousPermits[0].id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block px-1">Choose Business to Renew</span>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                    {previousPermits.map((permit, idx) => {
                      const addData = permit.additionalData || {};
                      const isSelected = selectedPermitIndex === idx;
                      return (
                        <button
                          type="button"
                          key={permit.id}
                          onClick={() => setSelectedPermitIndex(idx)}
                          className={cn(
                            "w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden flex flex-col gap-1.5",
                            isSelected ? "bg-slate-50 dark:bg-white/[0.01] border-primary shadow-md" : "bg-slate-50 dark:bg-white/[0.01] border-slate-100 dark:border-white/5"
                          )}
                          style={isSelected ? { borderColor: themeColor, backgroundColor: `${themeColor}0a` } : {}}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={cn("text-xs font-black uppercase italic truncate", isSelected ? "text-primary" : "text-slate-800 dark:text-white")} style={isSelected ? { color: themeColor } : {}}>
                              {addData.businessName || "N/A"}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white shrink-0" style={{ backgroundColor: themeColor }}>
                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleDeclinePreviousPermit}
                  variant="outline"
                  className="rounded-full py-6 font-black uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50 transition-all"
                >
                  No, Keep Blank
                </Button>
                <Button
                  type="button"
                  onClick={handleSelectPreviousPermit}
                  className="rounded-full py-6 font-black uppercase tracking-widest text-[10px] text-white bg-primary"
                  style={{ backgroundColor: themeColor }}
                >
                  Yes, Autofill Details
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
