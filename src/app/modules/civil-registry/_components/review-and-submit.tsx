import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, ChevronLeft } from "lucide-react";

interface ReviewAndSubmitProps {
    title?: string;
    subtitle?: string;
    detailsCards?: React.ReactNode;
    feeSummary?: React.ReactNode;
    documentsSection?: React.ReactNode;
    expectedPayment?: number;
    
    // Privacy state
    policyAccepted: boolean;
    onPolicyAcceptedChange: (val: boolean) => void;
    onReviewPolicy?: () => void;
    showErrors?: boolean;
    policyErrorText?: string;
    
    // Actions
    submitting: boolean;
    submitLabel?: string;
    submitDisabled?: boolean;
    onSubmit: () => void;
    onBack: () => void;
    backLabel?: string;
    
    // Custom button layouts if needed
    customActions?: React.ReactNode;
}

export default function ReviewAndSubmit({
    title = "Review & Submit",
    subtitle = "Verify information before submission",
    detailsCards,
    feeSummary,
    documentsSection,
    expectedPayment,
    policyAccepted,
    onPolicyAcceptedChange,
    onReviewPolicy,
    showErrors = false,
    policyErrorText = "Agreement required before submitting",
    submitting,
    submitLabel = "Submit Application",
    submitDisabled = false,
    onSubmit,
    onBack,
    backLabel = "Modify Details",
    customActions
}: ReviewAndSubmitProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{title}</h2>
                    <p className="text-xs text-slate-500 font-medium italic">{subtitle}</p>
                </div>
            </div>

            {/* Details and Content Grid */}
            <div className="space-y-6">
                {detailsCards && (
                    <div className="w-full">
                        {detailsCards}
                    </div>
                )}

                {/* Documents section */}
                {documentsSection && (
                    <div className="w-full">
                        {documentsSection}
                    </div>
                )}

                {/* Fee display */}
                {feeSummary ? (
                    <div className="w-full">
                        {feeSummary}
                    </div>
                ) : expectedPayment !== undefined ? (
                    <div className="w-full bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 flex justify-between items-center mt-6">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Total Amount Due</h4>
                            <p className="text-slate-500 font-bold uppercase text-[9px] italic mt-0.5">LCR Fee Schedule</p>
                        </div>
                        <span className="text-2xl font-black text-theme-primary tracking-tighter">
                            {expectedPayment === 0 ? "FREE" : `₱${expectedPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Data Privacy Agreement panel */}
            <div className="space-y-2 mt-6">
                <div
                    onClick={() => {
                        if (policyAccepted) {
                            onPolicyAcceptedChange(false);
                        } else if (onReviewPolicy) {
                            onReviewPolicy();
                        } else {
                            onPolicyAcceptedChange(true);
                        }
                    }}
                    className={cn(
                        "p-4 md:p-6 rounded-2xl md:rounded-3xl transition-all cursor-pointer flex items-center gap-4 md:gap-6 select-none bg-slate-50/50 dark:bg-white/5 border",
                        policyAccepted
                            ? "bg-theme-primary/10 border-theme-primary/20"
                            : (showErrors && !policyAccepted)
                                ? "border-2 border-red-500"
                                : "border-slate-200 dark:border-white/10 hover:border-theme-primary/30 hover:bg-slate-100/30 dark:hover:bg-white/10"
                    )}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (policyAccepted) {
                                onPolicyAcceptedChange(false);
                            } else if (onReviewPolicy) {
                                onReviewPolicy();
                            } else {
                                onPolicyAcceptedChange(true);
                            }
                        }}
                        className={cn(
                            "w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
                            policyAccepted
                                ? "border-theme-primary bg-theme-primary text-white"
                                : (showErrors && !policyAccepted)
                                    ? "border-red-500"
                                    : "border-slate-400 dark:border-white/30 bg-transparent"
                        )}
                    >
                        {policyAccepted ? <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" /> : null}
                    </div>
                    <div className="flex-1 text-xs text-left cursor-pointer select-none">
                        <div className="font-black uppercase text-[10px] md:text-xs tracking-wider text-slate-900 dark:text-white">
                            DATA PRIVACY AND TERMS AGREEMENT
                        </div>
                        <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5 md:mt-1 uppercase leading-normal line-clamp-2 md:line-clamp-none">
                            <span className="hidden md:inline">
                                I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. I CONFIRM ALL INFO IS TRUE AND CORRECT. CLICK TO REVIEW AGREEMENT.
                            </span>
                            <span className="md:hidden">
                                I AGREE TO THE DATA PRIVACY TERMS. CLICK TO REVIEW.
                            </span>
                        </div>
                    </div>
                    {onReviewPolicy && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReviewPolicy();
                            }}
                            className="text-[10px] font-black italic text-theme-primary hover:text-theme-hover shrink-0"
                        >
                            Review
                        </button>
                    )}
                </div>
                {(showErrors && !policyAccepted) && (
                    <p className="text-xs text-red-500 font-semibold mt-1 px-4 animate-pulse">
                        {policyErrorText}
                    </p>
                )}
            </div>

            {/* Actions */}
            {customActions ? (
                customActions
            ) : (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold uppercase tracking-wider text-xs px-6 py-5 rounded-2xl transition-all"
                    >
                        <ChevronLeft className="inline-block mr-1 w-4 h-4" />
                        {backLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting || submitDisabled}
                        className="bg-theme-primary hover:bg-theme-hover text-white font-black uppercase tracking-normal sm:tracking-wider text-[10px] sm:text-xs px-4 sm:px-8 py-5 shadow-lg shadow-theme-primary/20 disabled:opacity-60 cursor-pointer rounded-2xl transition-all"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-1 sm:gap-2">
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                Submitting...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-1 sm:gap-2">
                                <Check className="w-4 h-4 shrink-0" />
                                {submitLabel}
                                {expectedPayment !== undefined && (
                                    expectedPayment === 0
                                        ? " (Free)"
                                        : ` (₱${expectedPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                )}
                            </span>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
