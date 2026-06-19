"use client";

import React, { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyConsentCardProps {
  privacyAccepted: boolean;
  onToggle: () => void;
  showValidationErrors: boolean;
  themeColor?: string; // Default is municipal green
  id?: string;
}

export const PrivacyConsentCard = forwardRef<HTMLDivElement, PrivacyConsentCardProps>(
  (
    {
      privacyAccepted,
      onToggle,
      showValidationErrors,
      themeColor = "var(--primary-theme)",
      id = "privacyConsentCard",
    },
    ref
  ) => {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100" ref={ref}>
        <div
          id={id}
          onClick={onToggle}
          className={cn(
            "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
            privacyAccepted
              ? "shadow-sm"
              : showValidationErrors
                ? "bg-rose-50/10 border-rose-500 ring-2 ring-rose-500/20 animate-pulse"
                : "bg-slate-50 border-transparent hover:border-slate-200"
          )}
          style={{
            backgroundColor: privacyAccepted ? `${themeColor}0d` : undefined,
            borderColor: privacyAccepted ? themeColor : undefined,
          }}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
              privacyAccepted
                ? "text-white"
                : showValidationErrors
                  ? "border-rose-500"
                  : "border-slate-300"
            )}
            style={{
              backgroundColor: privacyAccepted ? themeColor : undefined,
              borderColor: privacyAccepted ? themeColor : undefined,
            }}
          >
            {privacyAccepted && <Check className="w-3.5 h-3.5" />}
          </div>
          <div className="space-y-1 text-left">
            <p className="text-xs font-black italic uppercase tracking-tight text-slate-900">
              Data Privacy and Terms Agreement
            </p>
            <p className="text-[8px] text-slate-500 font-bold leading-relaxed italic uppercase tracking-widest">
              I authorize the LGU to process my personal information in accordance with the Data Privacy Act. I confirm all info is true and correct. Click to review agreement.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

PrivacyConsentCard.displayName = "PrivacyConsentCard";
export default PrivacyConsentCard;
