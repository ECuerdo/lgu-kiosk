"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, Scale, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrivacyTermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    onDecline?: () => void;
    themeColor: string;
}

type TabType = "PRIVACY" | "TERMS";

export default function PrivacyTermsModal({ isOpen, onClose, onAccept, onDecline, themeColor }: PrivacyTermsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("PRIVACY");
    const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
    const [hasReadTerms, setHasReadTerms] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement>(null);

    const updateReadStatus = (tab: TabType) => {
        const target = containerRef.current;
        if (!target) return;

        const reachedBottom =
            target.scrollHeight - target.scrollTop <= target.clientHeight + 40;

        if (reachedBottom) {
            if (tab === "PRIVACY") setHasReadPrivacy(true);
            if (tab === "TERMS") setHasReadTerms(true);
        }
    };

    useEffect(() => {
        const resetScroll = () => {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
                updateReadStatus(activeTab);
            }
        };

        resetScroll();
        const frame = requestAnimationFrame(resetScroll);
        const t2 = setTimeout(resetScroll, 50);

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(t2);
        };
    }, [activeTab]);

    useEffect(() => {
        if (!isOpen) return;

        const checkLayout = () => updateReadStatus(activeTab);
        const frame = requestAnimationFrame(checkLayout);
        window.addEventListener("resize", checkLayout);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", checkLayout);
        };
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (!isOpen || !containerRef.current || !bottomSentinelRef.current) return;

        const observedTab = activeTab;
        const observer = new IntersectionObserver(
            entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                if (observedTab === "PRIVACY") setHasReadPrivacy(true);
                if (observedTab === "TERMS") setHasReadTerms(true);
            },
            {
                root: containerRef.current,
                threshold: 0.8,
            }
        );

        observer.observe(bottomSentinelRef.current);
        return () => observer.disconnect();
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, tab: TabType) => {
        const target = e.currentTarget;
        const reachedBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 40;
        if (reachedBottom) {
            if (tab === "PRIVACY") {
                setHasReadPrivacy(true);
            }
            if (tab === "TERMS") {
                setHasReadTerms(true);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-24 md:pt-28 pb-8 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
            {/* Modal Window Container */}
            <div className="relative w-full max-w-lg h-[75dvh] max-h-[760px] bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10">
                {/* Ambient Glow behind header */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 blur-[80px] rounded-full opacity-15 pointer-events-none"
                    style={{ backgroundColor: themeColor }}
                />

                {/* Modal Header */}
                <div className="shrink-0 p-4 sm:p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5 shrink-0">
                            <ShieldCheck className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic block leading-none">Legal & Compliance</span>
                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
                                Data Protection & Agreement
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="shrink-0 px-4 sm:px-8 pt-3 sm:pt-4 pb-2 flex border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                    {[
                        { id: "PRIVACY", label: "Privacy Policy", icon: ShieldCheck },
                        { id: "TERMS", label: "Terms of Service", icon: Scale }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest italic transition-all shrink-0",
                                    isSelected
                                        ? "text-white shadow-sm sm:shadow-md"
                                        : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                )}
                                style={isSelected ? { backgroundColor: themeColor } : undefined}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Body (Scrollable) */}
                <div
                    ref={containerRef}
                    onScroll={(e) => handleScroll(e, activeTab)}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6 md:p-8 space-y-4 text-slate-600 dark:text-slate-300 scrollbar-thin"
                >
                    {activeTab === "PRIVACY" ? (
                        <div className="space-y-3 sm:space-y-4 text-[11px] sm:text-xs md:text-sm font-medium leading-relaxed italic">
                            <div
                                className="p-3 sm:p-4 rounded-xl flex gap-3 border items-center"
                                style={{
                                    backgroundColor: `${themeColor}0a`,
                                    borderColor: `${themeColor}20`,
                                    color: themeColor
                                }}
                            >
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                <p className="font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider">
                                    R.A. 10173 Data Privacy Compliance
                                </p>
                            </div>

                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                1. Scope of Personal Data Collected
                            </h4>
                            <p>
                                In compliance with the Data Privacy Act of 2012 (R.A. 10173) of the Republic of the Philippines, the Municipal Government of Mapandan, Pangasinan collects, processes, and protects personal and corporate data required for online community tax certificates (Cedula) and business permit filings.
                            </p>
                            <p>
                                This includes: your full name, birth date, contact number, address, occupation, tax details, corporate registration copies, government-issued IDs, and annual income or gross capitalization declarations.
                            </p>

                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                2. Purpose of Collection and Processing
                            </h4>
                            <p>
                                Your personal and business data is solely used to verify your identity, assess appropriate municipal taxation fees, inspect licensing checklists, track municipal records, and securely approve or reject electronic request filings.
                            </p>

                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                3. Safety Safeguards and Retention
                            </h4>
                            <p>
                                We employ industry-standard encryption, strict access control, and dynamic security audits to protect your data from unauthorized access or leakage. Records are securely retained in our government system for as long as legally required for local audit and municipal validation.
                            </p>

                            {hasReadPrivacy && (
                                <div className="pt-4 flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (containerRef.current) {
                                                containerRef.current.scrollTop = 0;
                                            }
                                            setActiveTab("TERMS");
                                        }}
                                        className="h-9 px-5 text-white rounded-full text-[9px] font-black uppercase tracking-widest italic transition-all shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        Continue to Terms of Service
                                        <span className="text-xs">→</span>
                                    </Button>
                                </div>
                            )}
                            <div ref={bottomSentinelRef} className="h-2 w-full" aria-hidden="true" />
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4 text-[11px] sm:text-xs md:text-sm font-medium leading-relaxed italic">
                            <div
                                className="p-3 sm:p-4 rounded-xl flex gap-3 border items-center"
                                style={{
                                    backgroundColor: `${themeColor}0a`,
                                    borderColor: `${themeColor}20`,
                                    color: themeColor
                                }}
                            >
                                <Scale className="w-5 h-5 shrink-0" />
                                <p className="font-black text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider">
                                    Official Filing Integrity & Rules
                                </p>
                            </div>

                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                1. Accuracy of Declarations
                            </h4>
                            <p>
                                By using this online service portal, you solemnly swear under pain of perjury that all details, financial declarations (such as annual capitalization and gross sales), and documents uploaded are genuine, accurate, and correct.
                            </p>

                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                2. Original Scans & File Integrity
                            </h4>
                            <p>
                                All submitted requirements (e.g. Barangay Clearances, UMID IDs, DTI Registry copies) must be clear, high-resolution original document scans. Blurred, modified, or forged files will result in immediate rejection of the filing request.
                            </p>

                            <h4 className="font-black text-red-500 dark:text-red-400 uppercase tracking-wider text-[10px] sm:text-xs block pt-1 sm:pt-2">
                                3. Three-Strike Account Suspension Rule
                            </h4>
                            <p className="font-bold text-red-500 dark:text-red-400">
                                IMPORTANT: In order to protect municipal resources, EMapandan LGU enforces a strict Three-Strike Rejection Policy. If your applications are rejected 3 times in the same Category of the request due to fraudulent data, false values, or intentional document violations, your online portal access will be permanently suspended, requiring you to apply in-person directly at the Mapandan Municipal Hall.
                            </p>
                            <div ref={bottomSentinelRef} className="h-2 w-full" aria-hidden="true" />
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 p-4 sm:p-6 md:p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Side-by-side Read Progress Indicators */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <div
                                className={cn(
                                    "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0",
                                    hasReadPrivacy ? "text-white" : "border-slate-300 dark:border-white/20"
                                )}
                                style={hasReadPrivacy ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                            >
                                {hasReadPrivacy && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            </div>
                            <span
                                className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-colors"
                                style={hasReadPrivacy ? { color: themeColor } : { color: "#94a3b8" }}
                            >
                                Privacy Policy
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <div
                                className={cn(
                                    "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0",
                                    hasReadTerms ? "text-white" : "border-slate-300 dark:border-white/20"
                                )}
                                style={hasReadTerms ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                            >
                                {hasReadTerms && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                            </div>
                            <span
                                className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-colors"
                                style={hasReadTerms ? { color: themeColor } : { color: "#94a3b8" }}
                            >
                                Terms of Service
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { if (onDecline) onDecline(); onClose(); }}
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest italic"
                        >
                            Decline
                        </Button>
                        <Button
                            type="button"
                            onClick={onAccept}
                            disabled={!hasReadPrivacy || !hasReadTerms}
                            className={cn(
                                "h-9 sm:h-10 px-4 sm:px-6 text-white rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest italic transition-all active:scale-95 shadow-md",
                                (!hasReadPrivacy || !hasReadTerms)
                                    ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-white/5 text-slate-400 border border-slate-300 dark:border-white/10"
                                    : "shadow-lg hover:scale-105 active:scale-95"
                            )}
                            style={hasReadPrivacy && hasReadTerms ? { backgroundColor: themeColor } : undefined}
                        >
                            Agree & Continue
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
