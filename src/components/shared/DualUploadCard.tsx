"use client";

import React from "react";
import { QrCode, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadSlot {
  id: string;
  label: string;
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  hasFile: boolean;
  fileName?: string;
}

interface DualUploadCardProps {
  onQrClick: () => void;
  isCreatingHandoff: boolean;
  slots: UploadSlot[];
  qrTitle?: string;
  qrDesc?: string;
  directTitle?: string;
  directDesc?: string;
  className?: string;
}

export default function DualUploadCard({
  onQrClick,
  isCreatingHandoff,
  slots,
  qrTitle = "Upload from Phone",
  qrDesc = "Scan a QR code to securely upload both ID photos using your phone camera.",
  directTitle = "Direct Upload",
  directDesc = "Upload ID files directly from this kiosk's local filesystem.",
  className
}: DualUploadCardProps) {
  return (
    <div className={cn("bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 text-center space-y-6 shadow-sm", className)}>
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Left Card: Upload from Phone via QR Handoff */}
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white/[0.02] flex flex-col justify-between min-h-[220px]">
          <div>
            <QrCode className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{qrTitle}</h4>
            <p className="text-slate-500 text-[10px] font-semibold mt-1">{qrDesc}</p>
          </div>
          <Button
            type="button"
            onClick={onQrClick}
            disabled={isCreatingHandoff}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest text-[9px] rounded-xl mt-4 w-full py-5 border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {isCreatingHandoff ? "Creating Session..." : "Scan QR Code"}
          </Button>
        </div>

        {/* Right Card: Direct Kiosk File Upload */}
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-6 bg-white/[0.02] flex flex-col justify-between min-h-[220px]">
          <div>
            <UploadCloud className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{directTitle}</h4>
            <p className="text-slate-500 text-[10px] font-semibold mt-1">{directDesc}</p>
          </div>
          <div className={cn("grid gap-3 mt-4", slots.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {slots.map((slot) => (
              <div key={slot.id} className="relative w-full">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  id={slot.id}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      slot.onFileSelect(file);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById(slot.id)?.click()}
                  disabled={slot.isUploading}
                  className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 font-bold uppercase tracking-widest text-[9px] rounded-xl w-full py-4 text-slate-700 dark:text-slate-300 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {slot.label}
                </Button>
                {slot.hasFile && slot.fileName && (
                  <p className="text-[9px] text-slate-400 font-medium truncate max-w-full mt-1.5 text-center">
                    {slot.fileName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
