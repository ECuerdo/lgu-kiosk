/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";


import React, { useState, useEffect, useRef } from "react";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import SecureQrUploadModal from "@/components/shared/SecureQrUploadModal";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Loader2,
    Check,
    AlertCircle,
    ArrowRight,
    Upload,
    CheckCircle2,
    FileText,
    ChevronLeft,
    QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    getCurrentUserResident,
    ensureCivilRegistryTransactionTypes,
    submitCivilRegistryTransaction,
    getTransactionTypes,
    getLatestForm1AForCurrentUser,
    getTransactionById,
    getSecureUploadUrlAction
} from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import PremiumDocumentUpload from "../../../../components/shared/PremiumDocumentUpload";



// --- UPLOAD FILE SECURELY VIA SIGNED UPLOAD URL ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'bin';
    
    const res = await getSecureUploadUrlAction(fieldName, "lcr/birth_psa_endorsement", fileExt, userId);
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



const STORAGE_KEY = "lcr_birth_psa_endorsement_draft";

type Step = "INFORMANT" | "SUBJECT" | "REVIEW";

const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "INFORMANT", label: "Informant Info", icon: User },
    { id: "SUBJECT", label: "Subject & Documents", icon: FileText },
    { id: "REVIEW", label: "Review & Submit", icon: CheckCircle2 },
];

export default function BirthPsaEndorsementPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [currentStep, setCurrentStep] = useState<Step>("INFORMANT");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resident, setResident] = useState<any>(null);
    const [typeId, setTypeId] = useState<string>("");
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [revisionTx, setRevisionTx] = useState<any>(null);
    const [showErrors, setShowErrors] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFile, setViewerFile] = useState<File | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [previews, setPreviews] = useState<Record<string, string | null>>({});

    // QR Upload Handoff State
    const [handoffToken, setHandoffToken] = useState("");
    const [handoffQrCode, setHandoffQrCode] = useState("");
    const [handoffSessionSlot, setHandoffSessionSlot] = useState("");
    const [handoffExpiresAt, setHandoffExpiresAt] = useState(0);
    const [isHandoffOpen, setIsHandoffOpen] = useState(false);
    const [isCreatingHandoff, setIsCreatingHandoff] = useState(false);

    // QR Handoff Polling Effect
    useEffect(() => {
        if (!handoffToken) return;
        const poll = window.setInterval(async () => {
            try {
                const response = await fetch(`/api/upload-handoff/${encodeURIComponent(handoffToken)}`, {
                    cache: "no-store",
                });
                const result = await response.json();
                if (result.status === "uploaded") {
                    const uploadedFiles = result.files || [];
                    const uploadedFile = uploadedFiles[0];
                    if (uploadedFile) {
                        const targetKey = handoffSessionSlot.replace("lcr_", "");
                        const fileExt = uploadedFile.url.split('.').pop() || 'bin';
                        const fakeFile = new File([], uploadedFile.fileName, { type: `application/${fileExt}` });
                        
                        setFiles(prev => ({ ...prev, [targetKey]: fakeFile }));
                        setPreviews(prev => ({ ...prev, [targetKey]: uploadedFile.url }));
                        
                        saveDraftFile(STORAGE_KEY, targetKey, fakeFile).catch(err => console.error("Failed to save draft file in IndexedDB:", err));
                        
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

    const startHandoff = async (docKey: string) => {
        if (!userId || isCreatingHandoff) return;
        setIsCreatingHandoff(true);
        try {
            const slot = `lcr_${docKey}`;
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
        const map: Record<string, string> = {
            lcr_psaNegativeCert: "PSA Negative Certification",
            lcr_form1a: "Form 1A (Local Registry Copy)"
        };
        return map[handoffSessionSlot] || "Document";
    };

    const handleOpenViewer = (file: File | null, title: string, url: string | null = null) => {
        setViewerFile(file);
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    // Form State
    const [formData, setFormData] = useState({
        relationship: "",
        email: "",
        contactNumber: "",
        informantFirstName: "",
        informantMiddleName: "",
        informantLastName: "",
        informantSuffix: "",
        informantBirthDate: "",
        informantAge: "",
        informantCivilStatus: "",
        informantCitizenship: "",
        informantOccupation: "",
        informantAddress: "",
        // Subject fields
        subjectFullName: "",
        subjectDateOfBirth: "",
        mothersMaidenName: "",
    });

    const [files, setFiles] = useState<Record<string, File | null>>({
        psaNegativeCert: null,
        form1a: null,
    });

    // Privacy / Terms modal state
    const [policyOpen, setPolicyOpen] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isRestoredRef = useRef(false);

    // Restore progress from session storage & IndexedDB
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("revisionId")) return;

        const savedStep = sessionStorage.getItem("psa-endorsement-step");
        const savedForm = sessionStorage.getItem("psa-endorsement-form");

        if (savedStep) setCurrentStep(savedStep as Step);
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                setFormData(prev => ({
                    ...prev,
                    ...parsed
                }));
            } catch (e) {
                console.error("Failed to parse saved form", e);
            }
        }

        // Hydrate files from IndexedDB
        async function hydrateFiles() {
            try {
                const draftFiles = await getDraftFiles(STORAGE_KEY);
                if (draftFiles && Object.keys(draftFiles).length > 0) {
                    setFiles(prev => ({
                        ...prev,
                        ...draftFiles
                    }));
                    toast.info("Progress restored. Uploaded document drafts recovered.", {
                        duration: 6000
                    });
                }
            } catch (error) {
                console.error("Failed to hydrate draft files from IndexedDB:", error);
            }
        }

        hydrateFiles();
    }, []);

    useEffect(() => {
        if (!loading && !revisionId) {
            sessionStorage.setItem("psa-endorsement-step", currentStep);
            sessionStorage.setItem("psa-endorsement-form", JSON.stringify(formData));
        }
    }, [currentStep, formData, loading, revisionId]);

    useEffect(() => {
        async function init() {
            try {
                const savedResident = sessionStorage.getItem("active_resident");
                if (!savedResident) {
                    router.push("/");
                    return;
                }

                const residentObj = JSON.parse(savedResident);
                const uId = residentObj.userId || residentObj.id;
                if (!uId) {
                    router.push("/");
                    return;
                }
                setUserId(uId);

                await ensureCivilRegistryTransactionTypes();
                
                const urlParams = new URLSearchParams(window.location.search);
                const revId = urlParams.get("revisionId");

                let txData: any = null;
                if (revId) {
                    const txRes = await getTransactionById(revId, uId);
                    if (txRes.success && txRes.data) {
                        txData = txRes.data;
                        setRevisionId(revId);
                        setRevisionTx(txData);
                    } else {
                        toast.error("Failed to fetch revision details");
                    }
                }

                const [resResult, typesResult] = await Promise.all([
                    getCurrentUserResident(uId),
                    getTransactionTypes()
                ]);

                if (resResult.success && resResult.data) {
                    const r = resResult.data;
                    setResident(r);

                    const parts = [
                        r.houseNumber && `#${r.houseNumber}`,
                        r.street && `${r.street} St.`,
                        r.purok && `Purok ${r.purok}`,
                        r.sitio && `Sitio ${r.sitio}`,
                        r.barangay && `Brgy. ${r.barangay}`,
                        r.municipality || "",
                        r.province || "Pangasinan"
                    ].filter(Boolean);
                    const constructedAddr = parts.join(", ").toUpperCase();

                    if (txData) {
                        const addData = txData.additionalData as any || {};
                        const resSnapshot = txData.residentSnapshot as any || r || {};

                        const previews: Record<string, string | null> = {};
                        const fileKeys = ["psaNegativeCert", "form1a"];
                        fileKeys.forEach(k => {
                            if (addData[k] && typeof addData[k] === "string" && addData[k].startsWith("http")) {
                                previews[k] = addData[k];
                            }
                        });

                        setFormData(prev => ({
                            ...prev,
                            relationship: addData.relationship || prev.relationship,
                            email: addData.email || resSnapshot.email || prev.email,
                            contactNumber: addData.contactNumber || resSnapshot.contactNumber || prev.contactNumber,
                            informantFirstName: addData.informantFirstName || resSnapshot.firstName || prev.informantFirstName,
                            informantMiddleName: addData.informantMiddleName || resSnapshot.middleName || prev.informantMiddleName,
                            informantLastName: addData.informantLastName || resSnapshot.lastName || prev.informantLastName,
                            informantSuffix: addData.informantSuffix || resSnapshot.suffix || prev.informantSuffix,
                            informantBirthDate: addData.informantBirthDate || prev.informantBirthDate,
                            informantAge: addData.informantAge || prev.informantAge,
                            informantCivilStatus: addData.informantCivilStatus || prev.informantCivilStatus,
                            informantCitizenship: addData.informantCitizenship || prev.informantCitizenship,
                            informantOccupation: addData.informantOccupation || prev.informantOccupation,
                            informantAddress: addData.informantAddress || prev.informantAddress,
                            subjectFullName: addData.subjectFullName || "",
                            subjectDateOfBirth: addData.subjectDateOfBirth || "",
                            mothersMaidenName: addData.mothersMaidenName || "",
                        }));
                        setPreviews(previews);
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            email: prev.email || r.user?.email || "",
                            contactNumber: prev.contactNumber || r.contactNumber || "",
                            informantFirstName: r.firstName || "",
                            informantMiddleName: r.middleName || "",
                            informantLastName: r.lastName || "",
                            informantSuffix: r.suffix || "",
                            informantBirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
                            informantAge: r.age?.toString() || "",
                            informantCivilStatus: r.civilStatus || "",
                            informantCitizenship: r.citizenship || "FILIPINO",
                            informantOccupation: r.occupation || "",
                            informantAddress: constructedAddr
                        }));
                    }
                }

                if (typesResult.success && typesResult.data) {
                    const psaType = typesResult.data.find((t: any) => t.code === "LCR_PSA_ENDORSEMENT");
                    if (psaType) {
                        setTypeId(psaType.id);
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === "relationship") {
                if (value === "SELF" && resident) {
                    const sName = [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(" ") + (resident.suffix ? " " + resident.suffix : "");
                    const sDob = resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : "";
                    const mName = [resident.motherFirstName, resident.motherMiddleName, resident.motherLastName].filter(Boolean).join(" ");

                    next.subjectFullName = sName.toUpperCase();
                    next.subjectDateOfBirth = sDob;
                    next.mothersMaidenName = mName.toUpperCase();
                } else {
                    next.subjectFullName = "";
                    next.subjectDateOfBirth = "";
                    next.mothersMaidenName = "";
                }
            }
            return next;
        });

        if (name === "relationship" && value !== "SELF") {
            setFiles(prev => ({ ...prev, form1a: null }));
            saveDraftFile(STORAGE_KEY, "form1a", null).catch(err => {
                console.error("Failed to delete draft Form 1A file from IndexedDB:", err);
            });
        }

        if (name === "relationship" && value === "SELF") {
            const promise = (async () => {
                const res = await getLatestForm1AForCurrentUser(userId);
                if (res.success && res.data) {
                    const { docUrl, subjectName, dateOfBirth, mothersMaidenName } = res.data;

                    setFormData(prev => ({
                        ...prev,
                        subjectFullName: subjectName ? subjectName.toUpperCase() : prev.subjectFullName,
                        subjectDateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : prev.subjectDateOfBirth,
                        mothersMaidenName: mothersMaidenName ? mothersMaidenName.toUpperCase() : prev.mothersMaidenName
                    }));

                    if (docUrl) {
                        try {
                            const response = await fetch(docUrl);
                            const blob = await response.blob();
                            const filename = docUrl.split('/').pop() || "form_1a.pdf";
                            const file = new File([blob], filename, { type: blob.type });

                            setFiles(prev => ({
                                ...prev,
                                form1a: file
                            }));
                            setPreviews(prev => ({
                                ...prev,
                                form1a: docUrl
                            }));

                            await saveDraftFile(STORAGE_KEY, "form1a", file);
                            toast.success("Latest Form 1A found and automatically attached from your transactions!");
                        } catch (err) {
                            console.error("Failed to download Form 1A file:", err);
                        }
                    }
                }
            })();
            toast.promise(promise, {
                loading: "Checking for your latest issued Form 1A in transactions...",
                success: "Form 1A status checked.",
                error: "Failed to check or fetch Form 1A document."
            });
        }
    };

    const renderDocCard = (label: string, fileKey: string, required: boolean = true) => {
        const file = files[fileKey] || null;
        const preview = previews[fileKey] || null;

        return (
            <PremiumDocumentUpload
                key={fileKey}
                label={label}
                required={required}
                file={file}
                previewUrl={preview}
                error={showErrors && required && !file && !preview}
                onFileSelect={async (newFile) => {
                    if (newFile.size > 5 * 1024 * 1024) {
                        toast.error("File size exceeds 5MB limit.");
                        return;
                    }

                    const fileToProcess = newFile;

                    try {
                        toast.loading("Uploading and preparing document preview...", { id: `file-upload-${fileKey}` });
                        const sanitizedKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const publicUrl = await uploadFileClientSide(fileToProcess, sanitizedKey, userId);

                        setFiles(prev => ({ ...prev, [fileKey]: fileToProcess }));
                        setPreviews(prev => ({ ...prev, [fileKey]: publicUrl }));
                        await saveDraftFile(STORAGE_KEY, fileKey, fileToProcess);
                        toast.success("Document uploaded & preview ready!", { id: `file-upload-${fileKey}` });
                    } catch (uploadErr) {
                        console.error(`[ClientUpload] Failed to upload ${fileKey} on-the-fly:`, uploadErr);
                        toast.error("Upload failed. Local copy stored (preview limited).", { id: `file-upload-${fileKey}` });

                        setFiles(prev => ({ ...prev, [fileKey]: fileToProcess }));
                        setPreviews(prev => ({ ...prev, [fileKey]: fileToProcess.type.startsWith("image/") ? URL.createObjectURL(fileToProcess) : null }));
                        await saveDraftFile(STORAGE_KEY, fileKey, fileToProcess);
                    }
                }}
                onClear={async () => {
                    setFiles(prev => ({ ...prev, [fileKey]: null }));
                    setPreviews(prev => ({ ...prev, [fileKey]: null }));
                    await saveDraftFile(STORAGE_KEY, fileKey, null);
                    toast.success("File removed successfully.");
                }}
                onClickUpload={() => startHandoff(fileKey)}
                onView={() => handleOpenViewer(file, label, preview)}
            />
        );
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!policyAccepted) {
            setShowErrors(true);
            toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
            return;
        }
        if (!typeId) {
            toast.error("Service type not initialized. Please try again later.");
            return;
        }

        if (!files.psaNegativeCert && !previews.psaNegativeCert) {
            toast.error("Please upload PSA Negative Certification");
            return;
        }
        if (!files.form1a && !previews.form1a) {
            toast.error("Please upload Form 1A (Local Registry Copy)");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append("typeId", typeId);
            data.append("registryType", "BIRTH_PSA_ENDORSEMENT");
            if (revisionId) {
                data.append("revisionId", revisionId);
            }

            const residentSnapshot = {
                firstName: resident?.firstName || "",
                middleName: resident?.middleName || "",
                lastName: resident?.lastName || "",
                suffix: resident?.suffix || "",
                contactNumber: resident?.contactNumber || "",
                email: resident?.user?.email || "",
                residentId: resident?.residentId || "",
                address: resident ? `Brgy. ${resident.barangay}, ${resident?.municipality || ""}` : ""
            };

            data.append("residentSnapshot", JSON.stringify(residentSnapshot));

            const fileUrls: Record<string, string> = {};

            // First, copy any existing public URLs from previews
            Object.entries(previews || {}).forEach(([key, url]) => {
                if (url && typeof url === "string" && url.startsWith("http")) {
                    fileUrls[key] = url;
                }
            });

            const fileEntries = Object.entries(files);
            for (let i = 0; i < fileEntries.length; i++) {
                const [key, file] = fileEntries[i];
                if (!file) continue;
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

                if (fileUrls[key]) {
                    console.log(`[ClientUpload] Reusing existing public URL for ${key}:`, fileUrls[key]);
                    continue;
                }

                try {
                    toast.loading(`Uploading document ${i + 1}/${fileEntries.length}...`, { id: "upload-toast" });
                    const url = await uploadFileClientSide(file, sanitizedKey, userId);
                    fileUrls[key] = url;
                } catch (uploadErr) {
                    console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
                    toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "upload-toast" });
                    setSubmitting(false);
                    return;
                }
            }
            toast.dismiss("upload-toast");

            const additionalData = {
                ...formData,
                subjectName: formData.subjectFullName,
                psaEndorsementFee: 200,
                ...fileUrls
            };
            data.append("additionalData", JSON.stringify(additionalData));

            const res = await submitCivilRegistryTransaction(data, userId);

            if (res.success && res.data) {
                toast.success(revisionId ? "Revision resubmitted successfully!" : "Birth PSA Endorsement submitted successfully!");
                sessionStorage.removeItem("psa-endorsement-step");
                sessionStorage.removeItem("psa-endorsement-form");
                await clearDraftFiles(STORAGE_KEY);
                router.push(`/user/services/requests/${res.data.id}`);
            } else {
                toast.error(res.error || "Failed to submit endorsement request");
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "var(--primary-theme)" }} />
                <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic">Initializing Endorsement Form...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-4 py-8 md:px-12 md:py-12 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white">
            <SecureIdleTimer />
            <PrivacyTermsModal
                isOpen={policyOpen}
                onClose={() => setPolicyOpen(false)}
                onAccept={handleAcceptPolicy}
                onDecline={() => { setPolicyAccepted(false); }}
                themeColor="var(--primary-theme)"
            />
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
            />
            <SecureQrUploadModal
                isOpen={isHandoffOpen}
                onClose={() => {
                    setIsHandoffOpen(false);
                    setHandoffToken("");
                }}
                qrCode={handoffQrCode}
                expiresAt={handoffExpiresAt}
                slotLabel={getHandoffSlotLabel()}
            />

            {/* Title Header */}
            <div className="mx-auto max-w-7xl mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            BIRTH <span className="text-theme-primary underline decoration-[6px] md:decoration-8 decoration-theme-primary/20 underline-offset-[6px] md:underline-offset-[12px]">PSA ENDORSEMENT</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">LCR Civil Registry Request Portal</p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            onClick={() => router.push("/modules/civil-registry")}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold uppercase tracking-wider rounded-2xl py-6 px-8 border border-white/10 active:scale-95 transition-all text-xs"
                        >
                            <ChevronLeft className="inline-block mr-1 w-4 h-4" /> Back to Hub
                        </Button>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="mx-auto max-w-7xl mb-10">
                <div className="grid grid-cols-3 gap-1 md:gap-4 relative px-1 md:px-2">
                    {STEPS.map((step, idx) => {
                        const isActive = currentStep === step.id;
                        const stepIdx = STEPS.findIndex(s => s.id === currentStep);
                        const isCompleted = stepIdx >= idx;
                        const Icon = step.icon;

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (isCompleted) {
                                        setCurrentStep(step.id as Step);
                                    }
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                    !isCompleted && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border",
                                    isActive ? "bg-slate-100/80 dark:bg-[#0d120f]/60 text-theme-primary border-2 border-theme-primary shadow-[0_0_20px_color-mix(in_srgb,var(--primary-theme)_35%,transparent)] scale-105 md:scale-110" :
                                        isCompleted ? "bg-slate-50/50 dark:bg-white/[0.02] text-theme-primary border border-slate-200/80 dark:border-white/10" :
                                            "bg-transparent text-slate-400 dark:text-slate-600 border border-slate-200/40 dark:border-white/5 group-hover:border-theme-primary/30"
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

            <div className="mx-auto max-w-7xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative min-h-[500px] flex flex-col text-slate-900 dark:text-white">
                <AnimatePresence mode="wait">
                    {/* ===== STEP 1: INFORMANT ===== */}
                    {currentStep === "INFORMANT" && (
                        <motion.div
                            key="informant-step"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="space-y-6"
                        >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Personal Information</h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Your details as the requesting informant</p>
                                    </div>

                                    {revisionTx && (
                                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-800 dark:text-red-400 animate-in fade-in duration-300">
                                            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                            <div className="text-left space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider italic">Attention: Revision Needed</p>
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-300 leading-relaxed italic">
                                                    &ldquo;{revisionTx.rejectionRemarks || "Please check the highlighted checklist files or values and submit them again."}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Relationship to Subject <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={formData.relationship}
                                                onValueChange={(v) => handleSelectChange("relationship", v)}
                                            >
                                                <SelectTrigger className={cn("h-12 rounded-xl focus:ring-theme-primary shadow-sm text-xs md:text-sm bg-white dark:bg-slate-900 transition-all font-black text-slate-955 dark:text-white", (showErrors && !formData.relationship) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10")}>
                                                    <SelectValue placeholder="SELECT RELATIONSHIP" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 italic">
                                                    <SelectItem value="SELF">SELF (I AM THE SUBJECT)</SelectItem>
                                                    <SelectItem value="CHILD">CHILD</SelectItem>
                                                    <SelectItem value="PARENT">PARENT</SelectItem>
                                                    <SelectItem value="SIBLING">SIBLING</SelectItem>
                                                    <SelectItem value="RELATIVE">OTHER RELATIVE</SelectItem>
                                                    <SelectItem value="REPRESENTATIVE">AUTHORIZED REPRESENTATIVE</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(showErrors && !formData.relationship) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>

                                        {/* Personal Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">First Name</Label>
                                                <Input readOnly value={formData.informantFirstName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Middle Name</Label>
                                                <Input readOnly value={formData.informantMiddleName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Last Name</Label>
                                                <Input readOnly value={formData.informantLastName} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                            <div className="md:col-span-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suffix</Label>
                                                <Input readOnly value={formData.informantSuffix} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Birth Date</Label>
                                                <Input readOnly value={formData.informantBirthDate} type="date" className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white dark:[color-scheme:dark]" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Age</Label>
                                                <Input readOnly value={formData.informantAge} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Civil Status</Label>
                                                <Input readOnly value={formData.informantCivilStatus} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Citizenship</Label>
                                                <Input readOnly value={formData.informantCitizenship} className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 font-black italic text-slate-955 dark:text-white" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Informant Address</Label>
                                            <Input
                                                readOnly
                                                className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 transition-all font-black italic text-slate-955 dark:text-white uppercase"
                                                value={formData.informantAddress}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Occupation</Label>
                                                <Input
                                                    readOnly
                                                    className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 h-12 transition-all font-black italic text-slate-955 dark:text-white"
                                                    value={formData.informantOccupation}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Contact Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    name="contactNumber"
                                                    value={formData.contactNumber}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                                    className={cn(
                                                        "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-black text-slate-955 dark:text-white italic",
                                                        (showErrors && !formData.contactNumber) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
                                                    )}
                                                />
                                                {(showErrors && !formData.contactNumber) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-6">
                                        <Button
                                            onClick={() => {
                                                if (!formData.relationship || !formData.contactNumber) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all required informant details.");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("SUBJECT");
                                            }}
                                            className="rounded-full px-12 bg-theme-primary hover:bg-theme-hover text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-theme-primary/20"
                                        >
                                            Next Step
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 2: SUBJECT & DOCUMENTS ===== */}
                            {currentStep === "SUBJECT" && (
                                <motion.div
                                    key="subject-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                                            Subject Information & Documents
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium italic">Provide the details of the person whose birth record needs PSA endorsement</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Subject&apos;s Full Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="subjectFullName"
                                                placeholder="ENTER FULL NAME OF SUBJECT"
                                                value={formData.subjectFullName}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-black text-slate-955 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600",
                                                    (showErrors && !formData.subjectFullName) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
                                                )}
                                            />
                                            {(showErrors && !formData.subjectFullName) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Date of Birth <span className="text-red-500">*</span></Label>
                                            <Input
                                                type="date"
                                                name="subjectDateOfBirth"
                                                value={formData.subjectDateOfBirth}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all font-black text-slate-955 dark:text-white dark:[color-scheme:dark]",
                                                    (showErrors && !formData.subjectDateOfBirth) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
                                                )}
                                            />
                                            {(showErrors && !formData.subjectDateOfBirth) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Mother&apos;s Maiden Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                name="mothersMaidenName"
                                                placeholder="ENTER MOTHER'S MAIDEN NAME"
                                                value={formData.mothersMaidenName}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "rounded-xl bg-white dark:bg-slate-900 h-12 transition-all uppercase font-black text-slate-955 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600",
                                                    (showErrors && !formData.mothersMaidenName) ? "border-2 border-red-500" : "border border-slate-200 dark:border-white/10"
                                                )}
                                            />
                                            {(showErrors && !formData.mothersMaidenName) && (
                                                <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">Required</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Documents Section */}
                                    <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10 mt-6">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-white/5 border border-white/10 text-white rounded-lg">
                                                <Upload className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Required Documents</span>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">PSA Negative Certification Required</p>
                                                    <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 italic mt-1">
                                                        This is strictly required as proof that the record is not available in the national database. Obtain this from any PSA Serbilis outlet.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderDocCard("PSA Negative Certification", "psaNegativeCert", true)}
                                            {renderDocCard("Form 1A (Local Registry Copy)", "form1a", true)}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setCurrentStep("INFORMANT")}
                                            className="rounded-full px-8 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[10px] h-12"
                                        >
                                            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (!formData.subjectFullName || !formData.subjectDateOfBirth || !formData.mothersMaidenName) {
                                                    setShowErrors(true);
                                                    toast.error("Please fill in all subject details.");
                                                    return;
                                                }
                                                if (!files.psaNegativeCert && !previews.psaNegativeCert) {
                                                    setShowErrors(true);
                                                    toast.error("Please upload PSA Negative Certification.");
                                                    return;
                                                }
                                                if (!files.form1a && !previews.form1a) {
                                                    setShowErrors(true);
                                                    toast.error("Please upload Form 1A (Local Registry Copy).");
                                                    return;
                                                }
                                                setShowErrors(false);
                                                setCurrentStep("REVIEW");
                                            }}
                                            className="rounded-full px-12 bg-theme-primary hover:bg-theme-hover text-white font-black uppercase tracking-widest italic text-[10px] h-12 shadow-xl shadow-theme-primary/20"
                                        >
                                            Proceed to Review
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ===== STEP 3: REVIEW & SUBMIT ===== */}
                            {currentStep === "REVIEW" && (
                                <motion.div
                                    key="review-step"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Endorsement Review</h2>
                                            <p className="text-xs text-slate-500 font-medium italic">Verify information before submission</p>
                                        </div>
                                    </div>

                                    <Card className="bg-slate-50 dark:bg-white/5 border-none p-6 rounded-[2rem] space-y-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{resident?.firstName} {resident?.lastName} ({formData.relationship})</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Contact</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.contactNumber}</p>
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Informant Address</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.informantAddress}</p>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-4 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-theme-primary italic">Subject Name (To Endorse)</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase text-lg">{formData.subjectFullName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Date of Birth</span>
                                                <p className="font-black text-slate-900 dark:text-white italic">{formData.subjectDateOfBirth}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Mother&apos;s Maiden Name</span>
                                                <p className="font-black text-slate-900 dark:text-white italic uppercase">{formData.mothersMaidenName}</p>
                                            </div>
                                        </div>

                                        {/* Documents Summary */}
                                        <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic leading-none">Uploaded Documents</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border",
                                                    files.psaNegativeCert ? "bg-theme-primary/10 border-theme-primary/20 text-theme-primary" : "bg-red-50/30 border-red-200/50"
                                                )}>
                                                    {files.psaNegativeCert ? <Check className="w-4 h-4 text-theme-primary shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">PSA Negative Certification</p>
                                                        <p className="text-[8px] text-slate-400 italic">{files.psaNegativeCert ? files.psaNegativeCert.name : "Not uploaded"}</p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border",
                                                    (files.form1a || previews.form1a) ? "bg-theme-primary/10 border-theme-primary/20 text-theme-primary" : "bg-red-50/30 border-red-200/50"
                                                )}>
                                                    {(files.form1a || previews.form1a) ? <Check className="w-4 h-4 text-theme-primary shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Form 1A</p>
                                                        <p className="text-[8px] text-slate-400 italic">{files.form1a ? files.form1a.name : previews.form1a ? "Attached from previous draft" : "Not uploaded"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fee Display */}
                                        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-theme-primary/10 border border-theme-primary/20">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">PSA Endorsement Fee</span>
                                                <p className="text-[9px] text-slate-400 italic mt-0.5">Standard processing fee for PSA endorsement</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-theme-primary tracking-tight">₱200.00</span>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="space-y-4">
                                        {/* Data Privacy Agreement panel */}
                                        <div
                                            onClick={() => {
                                                if (policyAccepted) {
                                                    setPolicyAccepted(false);
                                                } else {
                                                    setPolicyOpen(true);
                                                }
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 select-none",
                                                policyAccepted
                                                    ? "bg-theme-primary/10 border-theme-primary/20"
                                                    : showErrors
                                                        ? "border-2 border-red-500"
                                                        : "border-slate-200/40 bg-white/30 dark:bg-white/5 hover:border-theme-primary/30"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (policyAccepted) {
                                                        setPolicyAccepted(false);
                                                    } else {
                                                        setPolicyOpen(true);
                                                    }
                                                }}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 mt-0.5",
                                                    policyAccepted
                                                        ? "bg-theme-primary border-theme-primary text-white"
                                                        : showErrors
                                                            ? "border-2 border-red-500"
                                                            : "border-slate-300"
                                                )}
                                            >
                                                {policyAccepted ? <Check className="w-3 h-3" /> : null}
                                            </button>
                                            <div className="flex-1 text-xs text-left cursor-pointer select-none" onClick={(e) => { e.stopPropagation(); setPolicyOpen(true); }}>
                                                <div className="font-black uppercase text-[11px] tracking-wider text-slate-900 dark:text-white">DATA PRIVACY AND TERMS AGREEMENT</div>
                                                <div className="text-[10px] text-slate-500 italic mt-1">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
                                                {(showErrors && !policyAccepted) && (
                                                    <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest mt-1 animate-pulse">Agreement required before submitting</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPolicyOpen(true);
                                                }}
                                                className="text-[10px] font-black italic text-theme-primary hover:text-theme-hover shrink-0"
                                            >
                                                Review
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setCurrentStep("SUBJECT")}
                                                className="h-14 rounded-full border-slate-200 dark:border-white/10 font-black uppercase tracking-widest italic text-[11px]"
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                                Modify Details
                                            </Button>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={submitting || (!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form1a && !previews.form1a)}
                                                className={cn(
                                                    "md:col-span-3 h-14 rounded-full font-black uppercase tracking-widest italic text-[11px] transition-all duration-300",
                                                    ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form1a && !previews.form1a))
                                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                        : "bg-theme-primary hover:bg-theme-hover text-white shadow-xl shadow-theme-primary/20"
                                                )}
                                            >
                                                {submitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                ) : ((!files.psaNegativeCert && !previews.psaNegativeCert) || (!files.form1a && !previews.form1a)) ? (
                                                    <>
                                                        Upload Required Documents
                                                        <AlertCircle className="w-5 h-5 ml-2" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Submit Birth PSA Endorsement Application
                                                        <CheckCircle2 className="w-5 h-5 ml-2" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
    );
}
