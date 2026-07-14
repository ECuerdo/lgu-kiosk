"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Calculator,
  User,
  ChevronRight,
  Loader2,
  Check,
  Home,
  Sparkles,
  Coins,
  Calendar,
  Clock,
  FileText,
  Printer,
  ArrowLeft,
  Upload,
  MapPin,
  Info,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import QRCode from "qrcode";
import SecureQrUploadModal from "@/components/shared/SecureQrUploadModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import SchedulePicker from "@/components/shared/SchedulePicker";
import { compressImage } from "@/lib/image-compression";
import { calculateCedula, CedulaResult, getCedulaPenaltyRate } from "@/lib/cedula";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { submitCedulaAppointment } from "./actions";
import PrintQueueTicket from "@/components/shared/PrintQueueTicket";

import SecureIdleTimer from "@/components/shared/SecureIdleTimer";

type Step = "STATUS" | "RESIDENT" | "TAX_DECLARATION" | "DECLARATION" | "CONFIRM" | "SUCCESS";

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "STATUS", label: "Status", icon: Sparkles },
  { id: "TAX_DECLARATION", label: "Tax Declaration", icon: Calculator },
  { id: "DECLARATION", label: "Schedule", icon: Calendar },
  { id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
];

interface CedulaAppointmentClientProps {
  resident: any;
  cedulaTypes: any[];
  config: {
    maxSlots: number;
    maxSlotsAM?: number;
    maxSlotsPM?: number;
    blockedDates: string[];
    activeDays: number[];
  };
  bookedSlots: { appointmentDate: Date; appointmentSlot: string }[];
  hasActiveIndividual: boolean;
  hasActiveJuridical: boolean;
  themeColor: string;
}

export function CedulaAppointmentClient({
  resident,
  cedulaTypes,
  config,
  bookedSlots,
  hasActiveIndividual,
  hasActiveJuridical,
  themeColor
}: CedulaAppointmentClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("STATUS");
  const [submitting, setSubmitting] = useState(false);
  const [applicantType, setApplicantType] = useState<"INDIVIDUAL" | "JURIDICAL">("INDIVIDUAL");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [calcResult, setCalcResult] = useState<CedulaResult | null>(null);
  const [newTransactionId, setNewTransactionId] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);
  const [isPriorityLane, setIsPriorityLane] = useState(false);
  const [printTriggered, setPrintTriggered] = useState(false);

  const branding = {
    logo: "/logo.png",
    word1: "MUNICIPALITY",
    word2: "PORTAL"
  };

  // Form inputs state
  const [formState, setFormState] = useState({
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
    // Calculations
    income: "",
    propertyValue: "",
    businessName: "",
    incomeSource: "PROFESSION",
    purpose: ""
  });

  useEffect(() => {
    if (applicantType === "JURIDICAL" && formState.incomeSource === "PROFESSION") {
      setFormState(prev => ({ ...prev, incomeSource: "BUSINESS" }));
    }
  }, [applicantType, formState.incomeSource]);

  // Appointment Schedule State
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const incomeInputRef = useRef<HTMLInputElement>(null);
  const businessNameInputRef = useRef<HTMLInputElement>(null);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [existingIdUrl, setExistingIdUrl] = useState<string | null>(resident?.idFrontUrl || null);
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState<string>("");
  const [proofFileName, setProofFileName] = useState<string>("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [incomeError, setIncomeError] = useState(false);
  const [businessNameError, setBusinessNameError] = useState(false);

  // QR Handoff States
  const [handoffToken, setHandoffToken] = useState("");
  const [handoffQrCode, setHandoffQrCode] = useState("");
  const [handoffExpiresAt, setHandoffExpiresAt] = useState(0);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [isCreatingHandoff, setIsCreatingHandoff] = useState(false);
  const [handoffSessionSlot, setHandoffSessionSlot] = useState("");

  // QR Handoff Polling
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
            if (handoffSessionSlot === "idFile") {
              setExistingIdUrl(files[0].url);
              setIdFileName(files[0].fileName || "Valid ID Upload");
            } else if (handoffSessionSlot === "proofFile") {
              setExistingProofUrl(files[0].url);
              setProofFileName(files[0].fileName || "Proof of Income Upload");
            }
            setIsHandoffOpen(false);
            setHandoffToken("");
            toast.success("Document uploaded successfully from mobile device!");
          }
        } else if (!response.ok) {
          setIsHandoffOpen(false);
          setHandoffToken("");
          toast.error("QR Code session expired.");
        }
      } catch (error) {
        console.error("Poller error:", error);
      }
    }, 2500);
    return () => window.clearInterval(poll);
  }, [handoffToken, handoffSessionSlot]);

  const startHandoff = async (slot: "idFile" | "proofFile") => {
    if (!resident || isCreatingHandoff) return;
    setIsCreatingHandoff(true);
    try {
      const userId = resident.userId || resident.id;
      const response = await fetch("/api/upload-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slot }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create QR upload session.");
      
      const qrDataUrl = await QRCode.toDataURL(result.uploadUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#071c12", light: "#ffffff" },
      });
      
      setHandoffToken(result.token);
      setHandoffSessionSlot(slot);
      setHandoffQrCode(qrDataUrl);
      setHandoffExpiresAt(result.expiresAt);
      setIsHandoffOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to configure handoff.");
    } finally {
      setIsCreatingHandoff(false);
    }
  };

  const getHandoffSlotLabel = () => {
    if (handoffSessionSlot === "idFile") return "Valid ID";
    return applicantType === "JURIDICAL" ? "Proof of Business Income" : "Proof of Income";
  };

  // Refs for sections (smooth scrolling)
  const idSectionRef = useRef<HTMLDivElement>(null);
  const proofSectionRef = useRef<HTMLDivElement>(null);
  const privacySectionRef = useRef<HTMLDivElement>(null);

  // Document Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<File | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");

  const handleViewFile = (file: File | null, existingUrl: string | null, title?: string) => {
    setViewerFile(file);
    setViewerUrl(existingUrl);
    if (title) {
      setViewerTitle(title);
    } else {
      const isProof = file === proofFile || (existingUrl === existingProofUrl && existingUrl !== null);
      setViewerTitle(isProof ? "Proof of Income Document" : "Valid ID Document");
    }
    setViewerOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "idFile" | "proofFile") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file extension and MIME type
      const allowedTypes = [
        "image/jpeg", "image/png", "image/webp",
        "application/pdf"
      ];
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || "";
      const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        toast.error("Invalid file type! Only standard images (PNG, JPG, WEBP) and PDFs are allowed.");
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

        if (hex.startsWith("FFD8FF") && mime === "image/jpeg") {
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

      const maxBytes = 5 * 1024 * 1024; // 5MB limit
      if (file.size > maxBytes) {
        toast.error(`The file "${file.name}" is too large! Maximum limit is 5MB`);
        e.target.value = "";
        return;
      }

      let fileToProcess = file;
      if (file.type.startsWith("image/")) {
        try {
          toast.loading("Compressing and optimizing document...", { id: "image-compress-toast" });
          fileToProcess = await compressImage(file);
          toast.success("Image optimized successfully!", { id: "image-compress-toast" });
        } catch (err) {
          console.error("Compression error:", err);
          toast.dismiss("image-compress-toast");
        }
      }

      if (field === "idFile") {
        setIdFile(fileToProcess);
      } else {
        setProofFile(fileToProcess);
      }
    }
  };

  // Compute active type ID
  const activeType = cedulaTypes.find(t => t.code === (applicantType === "INDIVIDUAL" ? "CEDULA_IND" : "CEDULA_JUR"));

  // Parse requiredDocs
  let docs: string[] = [];
  if (activeType) {
    if (Array.isArray(activeType.requiredDocs)) {
      docs = activeType.requiredDocs as string[];
    } else if (typeof activeType.requiredDocs === "string") {
      try {
        docs = JSON.parse(activeType.requiredDocs);
      } catch {
        docs = [];
      }
    } else if (activeType.requiredDocs && typeof activeType.requiredDocs === "object") {
      try {
        docs = Object.values(activeType.requiredDocs) as string[];
      } catch {
        docs = [];
      }
    }
  }

  // Parse defaultFees
  let fees: { name: string; label?: string; amount: number; code?: string }[] = [];
  if (activeType) {
    if (Array.isArray(activeType.defaultFees)) {
      fees = activeType.defaultFees as any[];
    } else if (typeof activeType.defaultFees === "string") {
      try {
        fees = JSON.parse(activeType.defaultFees);
      } catch {
        fees = [];
      }
    }
  }

  // Real-time tax calculator
  useEffect(() => {
    const baseFee = activeType?.baseFee || (applicantType === "INDIVIDUAL" ? 5 : 500);
    const result = calculateCedula({
      type: applicantType,
      income: parseFloat(formState.income.replace(/,/g, "")) || 0,
      propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
      baseFee,
      fulfillmentType: "PICK_UP",
      deliveryFee: 0
    });
    setCalcResult(result);
  }, [formState.income, formState.propertyValue, applicantType, activeType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const isStepValid = (stepId: Step) => {
    switch (stepId) {
      case "STATUS":
        if (hasActiveIndividual && applicantType === "INDIVIDUAL") return false;
        if (hasActiveJuridical && applicantType === "JURIDICAL") return false;
        return !!activeType?.id;
      case "TAX_DECLARATION":
        const isIncomeValid = !!formState.income.trim();
        if (applicantType === "JURIDICAL") {
          return isIncomeValid && !!formState.businessName.trim();
        }
        return isIncomeValid;
      case "DECLARATION":
        return !!selectedDate && !!selectedSlot;
      case "CONFIRM":
        return privacyAccepted;
      default:
        return true;
    }
  };

  const canNavigate = (targetStep: Step) => {
    const targetIdx = STEPS.findIndex(s => s.id === targetStep);
    const currentIdx = STEPS.findIndex(s => s.id === currentStep);
    if (targetIdx <= currentIdx) return true;

    for (let i = 0; i < targetIdx; i++) {
      if (!isStepValid(STEPS[i].id)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      if (currentStep === "STATUS") {
        if (hasActiveIndividual && applicantType === "INDIVIDUAL") {
          toast.error("You already have an active Individual Cedula request currently in progress.");
        } else if (hasActiveJuridical && applicantType === "JURIDICAL") {
          toast.error("You already have an active Juridical Cedula request currently in progress.");
        } else {
          toast.error("Please select your application status.");
        }
      } else if (currentStep === "TAX_DECLARATION") {
        if (applicantType === "JURIDICAL" && !formState.businessName.trim()) {
          toast.error("Please declare your Business Name.");
        } else if (!formState.income.trim()) {
          setIncomeError(true);
          incomeInputRef.current?.focus();
          incomeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          toast.error("Please declare your Gross Income.");
        }
      } else if (currentStep === "DECLARATION") {
        if (!selectedDate || !selectedSlot) {
          toast.error("Please select your appointment date and time session.");
        }
      }
      return;
    }
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!privacyAccepted) {
      setShowValidationErrors(true);
      toast.error("Please accept the Data Privacy and Terms Agreement to submit your application.");
      privacySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const userId = resident?.userId || resident?.id;
    if (!userId) {
      toast.error("Unauthorized. Missing resident session.");
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append("typeId", activeType?.id || "");
      submitData.append("appointmentSlot", selectedSlot);
      submitData.append("appointmentDate", selectedDate);
      submitData.append("residentSnapshot", JSON.stringify({
        firstName: formState.firstName,
        lastName: formState.lastName,
        middleName: formState.middleName,
        suffix: formState.suffix,
        gender: formState.gender,
        dateOfBirth: formState.dateOfBirth,
        civilStatus: formState.civilStatus,
        citizenship: formState.citizenship,
        houseNumber: formState.houseNumber,
        street: formState.street,
        barangay: formState.barangay,
        municipality: formState.municipality,
        province: formState.province,
        contactNumber: formState.contactNumber,
        email: formState.email
      }));
      submitData.append("additionalData", JSON.stringify({
        applicantType: applicantType,
        income: parseFloat(formState.income.replace(/,/g, "")) || 0,
        propertyValue: parseFloat(formState.propertyValue.replace(/,/g, "")) || 0,
        businessName: formState.businessName,
        incomeSource: formState.incomeSource,
        purpose: "Community Tax Certificate Appointment",
        calculatedTax: calcResult,
        isPriorityLane: isPriorityLane
      }));
      if (idFile) submitData.append("idFile", idFile);
      if (proofFile) submitData.append("proofFile", proofFile);
      if (existingIdUrl) submitData.append("existingIdUrl", existingIdUrl);
      if (existingProofUrl) submitData.append("existingProofUrl", existingProofUrl);

      const response = await submitCedulaAppointment(submitData, userId);
      if (response.success && response.data) {
        toast.success("Appointment booked successfully!");
        setNewTransactionId(response.data.id);
        setQueueNumber(response.data.queueNumber);
        setCurrentStep("SUCCESS");
      } else {
        toast.error(response.error || "Failed to book appointment.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const printSlip = () => {
    setPrintTriggered(true);
  };

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
          <div className="grid grid-cols-4 gap-1.5 md:gap-4 relative px-1 md:px-2 print:hidden">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isCompleted = STEPS.findIndex(s => s.id === currentStep) > idx;
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (canNavigate(step.id)) {
                      setCurrentStep(step.id);
                    } else {
                      toast.error("Please complete the current phase first.");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                    (!canNavigate(step.id) && !isActive) && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isActive ? "bg-theme-primary text-white border-theme-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105" :
                      isCompleted ? "bg-theme-primary/10 text-theme-primary border-theme-primary/30" :
                        "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent group-hover:border-theme-primary/30"
                  )}>
                    <Icon className="w-4 h-4 md:w-7 md:h-7" />
                  </div>
                  <span className={cn(
                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                    isActive ? "text-theme-primary opacity-100 font-black" : "opacity-40 group-hover:opacity-100 transition-opacity"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Form container */}
        <div className="bg-white dark:bg-[#0c1120] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 md:p-12 shadow-xl relative min-h-[400px] flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {currentStep === "STATUS" && (
                  <div className="space-y-8 text-center">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none pt-2">
                        Choose Application <span className="text-theme-primary">Pathway</span>
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium italic text-xs uppercase tracking-widest max-w-2xl mx-auto">
                        Select your current community tax status to proceed.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                      {[
                        {
                          id: "INDIVIDUAL",
                          icon: User,
                          label: cedulaTypes.find(t => t.code === "CEDULA_IND")?.name || "Individual Cedula",
                          desc: "Tax certificate for private citizens, employees, professionals, and self-employed individuals."
                        },
                        {
                          id: "JURIDICAL",
                          icon: Sparkles,
                          label: cedulaTypes.find(t => t.code === "CEDULA_JUR")?.name || "Corporate / Juridical",
                          desc: "Tax certificate for registered corporations, partnerships, and business organizations."
                        }
                      ].map(opt => {
                        const isSelected = applicantType === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setApplicantType(opt.id as any);
                              if (opt.id === "JURIDICAL") {
                                setFormState(p => ({ ...p, incomeSource: "BUSINESS" }));
                              } else {
                                setFormState(p => ({ ...p, incomeSource: "PROFESSION" }));
                              }
                            }}
                            className={cn(
                              "p-6 rounded-[2rem] border-2 text-left relative group select-none overflow-hidden transition-all duration-350 min-h-[180px] flex flex-col justify-between cursor-pointer",
                              isSelected
                                ? "border-theme-primary bg-theme-primary/[0.04] dark:bg-theme-primary/[0.08] shadow-lg scale-[1.01]"
                                : "border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-theme-primary/30"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                isSelected ? "bg-theme-primary/20 text-theme-primary" : "bg-theme-primary/10 text-theme-primary"
                              )}>
                                <Icon className="w-4 h-4 stroke-[2.5]" />
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-theme-primary flex items-center justify-center shadow-md animate-in zoom-in-50">
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
                  </div>
                )}

                {currentStep === "TAX_DECLARATION" && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight">
                        Tax <span className="text-theme-primary">Declaration</span>
                      </h2>
                      <p className="text-slate-500 font-medium italic text-xs">
                        Declare your annual financial status for the tax computation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column: Inputs */}
                      <div className="space-y-6">
                        {applicantType === "JURIDICAL" && (
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                              Business Name
                            </Label>
                            <Input
                              ref={businessNameInputRef}
                              type="text"
                              name="businessName"
                              value={formState.businessName}
                              onChange={(e) => {
                                handleInputChange(e);
                                if (businessNameError) setBusinessNameError(false);
                              }}
                              placeholder="Enter registered business name"
                              className={cn(
                                "h-12 px-4 rounded-xl dark:bg-white/5 text-sm font-bold bg-white transition-all",
                                businessNameError
                                  ? "border-red-500 ring-2 ring-red-500/20"
                                  : "border-slate-200 dark:border-white/5"
                              )}
                              required
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic ml-1">
                            Annual Gross Income
                          </Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-350 italic">₱</span>
                            <Input
                              ref={incomeInputRef}
                              type="text"
                              value={formState.income}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                if (val === '') {
                                  setFormState(p => ({ ...p, income: '' }));
                                  return;
                                }
                                const parts = val.split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                const formatted = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
                                setFormState(p => ({ ...p, income: formatted }));
                                if (incomeError) setIncomeError(false);
                              }}
                              placeholder="0.00"
                              className={cn(
                                "h-12 pl-10 rounded-xl dark:bg-white/5 text-lg font-black italic bg-white transition-all",
                                incomeError
                                  ? "border-red-500 ring-2 ring-red-500/20"
                                  : "border-slate-200 dark:border-white/5"
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic ml-1">
                            Income Source Category
                          </Label>
                          <div className="flex flex-col gap-2">
                            {[
                              {
                                id: "PROFESSION",
                                label: "Profession",
                                desc: "Employees, Freelancers, & Salary"
                              },
                              {
                                id: "BUSINESS",
                                label: "Business",
                                desc: "Trade, Stores, & Services"
                              },
                              {
                                id: "PROPERTY",
                                label: "Property",
                                desc: "Real Estate Rentals & Leases"
                              }
                            ].filter(opt => {
                              if (applicantType === "JURIDICAL") {
                                return opt.id !== "PROFESSION";
                              }
                              return true;
                            }).map(opt => {
                              const isSelected = formState.incomeSource === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setFormState(p => ({ ...p, incomeSource: opt.id }))}
                                  className={cn(
                                    "px-5 py-4 rounded-xl border-2 transition-all duration-305 text-left relative overflow-hidden flex items-center justify-between gap-4 group select-none shadow-sm cursor-pointer",
                                    isSelected
                                      ? "border-theme-primary bg-theme-primary/[0.05] dark:bg-theme-primary/[0.1] shadow-sm scale-[1.005]"
                                      : "border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:border-theme-primary/30"
                                  )}
                                >
                                  <h4 className={cn(
                                    "text-sm font-black uppercase italic tracking-wider whitespace-nowrap",
                                    isSelected ? "text-theme-primary" : "text-slate-800 dark:text-slate-200"
                                  )}>
                                    {opt.label}
                                  </h4>
                                  <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-tighter text-right",
                                    isSelected ? "text-theme-primary/70" : "text-slate-500 dark:text-slate-400"
                                  )}>
                                    {opt.desc}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Calculation Overlay */}
                      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-white/5 rounded-3xl p-6 md:p-10 text-white space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <Calculator className="w-24 h-24 rotate-12" />
                        </div>

                        <div className="space-y-4 relative z-10 font-bold">
                          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest italic opacity-70">
                            <span>Basic Tax</span>
                            <span>₱{(calcResult?.basicTax ?? (applicantType === "INDIVIDUAL" ? 5.00 : 500.00)).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest italic opacity-70">
                            <span>Additional Tax</span>
                            <span>₱{(calcResult?.additionalTax ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest italic text-amber-500">
                            <span>
                              Penalty ({Math.round(getCedulaPenaltyRate() * 100)}%)
                            </span>
                            <span>₱{(calcResult?.penalty ?? 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="relative z-10 pt-6 border-t border-white/10 flex justify-between items-end">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic block mb-1">Estimated CTC Due</span>
                            <span className="text-3xl font-black italic tracking-tighter text-theme-primary font-mono">
                              ₱{(calcResult?.totalAmount ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === "DECLARATION" && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight">
                        Schedule <span className="text-theme-primary">Declaration</span>
                      </h2>
                      <p className="text-slate-500 font-medium italic text-xs">
                        Choose an available date and select your time slot to book your municipal appointment.
                      </p>
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
                  </div>
                )}

                {currentStep === "CONFIRM" && (
                  <div className="space-y-8">
                    <div className="space-y-2 text-center md:text-left">
                      <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">Review <span className="text-theme-primary">& Finalize</span></h2>
                      <p className="text-slate-500 font-medium italic text-xs">Review your declaration before submitting for evaluation.</p>
                    </div>

                    {/* Paalala / Reminder Note */}
                    {(activeType?.pickupAddress || activeType?.processingTime || fees.length > 0) && (
                      <div className="flex gap-3 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="font-black uppercase tracking-widest text-[8px] md:text-[9px] text-amber-500">Important Reminders Before Your Appointment</p>
                          <ul className="space-y-1.5 list-none">
                            {activeType?.pickupAddress && (
                              <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                <span><span className="font-black text-slate-600 dark:text-slate-300">Report to:</span> {activeType.pickupAddress}</span>
                              </li>
                            )}
                            {activeType?.processingTime && (
                              <li className="flex items-start gap-1.5 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                <Clock className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                <span><span className="font-black text-slate-600 dark:text-slate-300">Processing time:</span> {activeType.processingTime}</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Supporting Documents (Optional) */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                      <div className="space-y-2 mb-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-705 dark:text-slate-300 flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-theme-primary" style={{ color: themeColor }} /> Attach Supporting Documents (Optional)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          If you want to skip bringing physical copies, you can upload them here via QR code.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ID File Card */}
                        <div className={cn(
                          "bg-slate-50 dark:bg-white/[0.02] border rounded-2xl p-6 flex flex-col justify-between items-center text-center transition-all min-h-[180px]",
                          existingIdUrl ? "border-emerald-500/30" : "border-slate-150 dark:border-white/5"
                        )}>
                          {existingIdUrl ? (
                            <div className="flex flex-col items-center justify-between h-full w-full space-y-2">
                              <div className="w-10 h-10 bg-emerald-500/10 text-theme-primary rounded-xl flex items-center justify-center" style={{ color: themeColor }}>
                                <ShieldCheck size={20} className="stroke-[2.5]" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest">Valid ID Attached</span>
                                <p className="text-slate-500 text-[8px] font-bold truncate max-w-[150px]">{idFileName || "Government-issued ID"}</p>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewFile(null, existingIdUrl, "Valid ID Card")}
                                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white font-black text-[8px] uppercase tracking-wider transition-all"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startHandoff("idFile")}
                                  className="px-3 py-1.5 rounded-full bg-theme-primary text-white font-black text-[8px] uppercase tracking-wider transition-all"
                                  style={{ backgroundColor: themeColor }}
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-between h-full w-full space-y-3">
                              <div className="space-y-1">
                                <ShieldAlert className="text-slate-400 mx-auto w-8 h-8" />
                                <h5 className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider">Valid ID Card</h5>
                                <p className="text-slate-400 text-[8px] leading-relaxed max-w-[200px] mx-auto">
                                  Optional: Government-issued Identification.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => startHandoff("idFile")}
                                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 font-black uppercase tracking-widest text-[8px] transition-all"
                              >
                                Upload via QR
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Proof of Income Card */}
                        <div className={cn(
                          "bg-slate-50 dark:bg-white/[0.02] border rounded-2xl p-6 flex flex-col justify-between items-center text-center transition-all min-h-[180px]",
                          existingProofUrl ? "border-emerald-500/30" : "border-slate-150 dark:border-white/5"
                        )}>
                          {existingProofUrl ? (
                            <div className="flex flex-col items-center justify-between h-full w-full space-y-2">
                              <div className="w-10 h-10 bg-emerald-500/10 text-theme-primary rounded-xl flex items-center justify-center" style={{ color: themeColor }}>
                                <ShieldCheck size={20} className="stroke-[2.5]" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest">Proof Attached</span>
                                <p className="text-slate-500 text-[8px] font-bold truncate max-w-[150px]">{proofFileName || "Income Statement"}</p>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewFile(null, existingProofUrl, "Proof of Income")}
                                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white font-black text-[8px] uppercase tracking-wider transition-all"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startHandoff("proofFile")}
                                  className="px-3 py-1.5 rounded-full bg-theme-primary text-white font-black text-[8px] uppercase tracking-wider transition-all"
                                  style={{ backgroundColor: themeColor }}
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-between h-full w-full space-y-3">
                              <div className="space-y-1">
                                <FileText className="text-slate-400 mx-auto w-8 h-8" />
                                <h5 className="font-black text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider">Proof of Income</h5>
                                <p className="text-slate-400 text-[8px] leading-relaxed max-w-[200px] mx-auto">
                                  Optional: Payslips, ITR, or Barangay Certificate of Low Income.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => startHandoff("proofFile")}
                                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 font-black uppercase tracking-widest text-[8px] transition-all"
                              >
                                Upload via QR
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Priority Lane Option */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                      <div
                        onClick={() => setIsPriorityLane(!isPriorityLane)}
                        className="flex items-start gap-3 cursor-pointer select-none p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                          isPriorityLane
                            ? "bg-theme-primary border-theme-primary text-white"
                            : "border-slate-300 dark:border-white/10"
                        )}
                          style={isPriorityLane ? { borderColor: themeColor, backgroundColor: themeColor } : {}}
                        >
                          {isPriorityLane && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                            ♿ Request Priority lane service
                          </p>
                          <p className="text-[8px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                            Check this if you are a Senior Citizen, PWD, or Pregnant applicant.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Privacy */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5" ref={privacySectionRef}>
                      <div
                        onClick={() => {
                          if (privacyAccepted) {
                            setPrivacyAccepted(false);
                          } else {
                            setIsPrivacyModalOpen(true);
                          }
                        }}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                          privacyAccepted
                            ? "bg-theme-primary/5 border-theme-primary shadow-sm"
                            : showValidationErrors
                              ? "bg-red-50/10 border-red-500 animate-pulse"
                              : "bg-slate-50 dark:bg-white/5 border-transparent hover:border-theme-primary/20"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                          privacyAccepted
                            ? "bg-theme-primary border-theme-primary text-white"
                            : showValidationErrors
                              ? "border-red-500"
                              : "border-slate-300 dark:border-white/10"
                        )}>
                          {privacyAccepted && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Data Privacy and Terms Agreement</p>
                          <p className="text-[8px] text-slate-500 font-medium leading-relaxed italic uppercase tracking-widest">
                            I authorize the LGU to process my personal information. I confirm all info is correct. Click to review agreement.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === "SUCCESS" && (
                  <div className="space-y-8 text-center py-6">
                    {queueNumber && (
                      <PrintQueueTicket
                        queueNumber={queueNumber}
                        residentName={`${formState.firstName} ${formState.lastName}`}
                        serviceName={activeType?.name || "Cedula Appointment"}
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
                            <span className="bg-theme-primary/10 text-theme-primary border border-theme-primary/20 rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest">
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
                          <span className="text-slate-400 font-semibold">Applicant Name:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{formState.lastName}, {formState.firstName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Scheduled Date:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Time Session:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{selectedSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Fulfillment Office:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{activeType?.pickupAddress || "Treasury Office"}</span>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-450 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-theme-primary" /> Requirements checklist:
                        </h4>
                        {docs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No specific documents required.</p>
                        ) : (
                          <ul className="text-xs font-semibold space-y-1.5 pl-5 list-disc text-slate-500 dark:text-slate-400 leading-relaxed">
                            {docs.map((doc, idx) => (
                              <li key={idx}>{doc}</li>
                            ))}
                            <li>Cash for payment (Final taxes computed on-site).</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
                      <Button onClick={printSlip} variant="outline" className="font-bold uppercase tracking-widest text-xs px-6 py-5 rounded-2xl w-full sm:w-auto">
                        <Printer className="w-4 h-4 mr-2" /> Print Ticket
                      </Button>
                      <Link href="/dashboard/appointment" className="w-full sm:w-auto">
                        <Button className="text-white font-bold uppercase tracking-widest text-xs px-8 py-6 rounded-2xl hover:opacity-90 transition-all w-full bg-theme-primary">
                          <Home className="w-4 h-4 mr-2" /> Finish & Exit
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Global Navigation Footer */}
          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
            {currentStep !== "SUCCESS" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (currentStep === "STATUS") {
                      router.push("/dashboard");
                    } else {
                      const stepIndex = STEPS.findIndex(s => s.id === currentStep);
                      if (stepIndex > 0) {
                        setCurrentStep(STEPS[stepIndex - 1].id);
                      }
                    }
                  }}
                  className="rounded-full px-8 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest italic text-[10px] h-10 md:h-14 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={currentStep === "CONFIRM" ? handleSubmit : handleNext}
                  disabled={submitting || (currentStep === "CONFIRM" && (!privacyAccepted))}
                  className="bg-theme-primary hover:bg-theme-primary/90 text-white shadow-xl text-[10px] md:text-xs rounded-xl md:rounded-2xl px-8 md:px-12 h-10 md:h-14 group transition-all duration-300 active:scale-95 font-black uppercase tracking-widest italic"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Booking Slot...</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {currentStep === "CONFIRM" ? "Book Appointment" : "Next Phase"}
                      <ChevronRight className={cn("w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform", submitting && "hidden")} />
                    </div>
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </main>
      <SecureQrUploadModal
        isOpen={isHandoffOpen}
        onClose={() => { setIsHandoffOpen(false); setHandoffToken(""); }}
        qrCode={handoffQrCode}
        expiresAt={handoffExpiresAt}
        slotLabel={getHandoffSlotLabel()}
      />
    </div>
  );
}
