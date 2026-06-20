/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import React from "react";
import { AlertCircle, FileWarning, Eye, CheckCircle2 } from "lucide-react";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import { cn } from "@/lib/utils";

export interface DocumentItem {
  key: string;
  label: string;
  file: File | null;
  previewUrl: string | null;
  error?: boolean;
  infoText?: string;
  onFileSelect: (file: File) => void;
  onClickUpload: () => void;
  onClear: () => void;
  onView: () => void;
}

interface RequiredDocumentsProps {
  title?: string;
  subtitle?: string;
  errorText?: string;
  warningBanner?: React.ReactNode;
  
  // Grid of upload items
  documents?: DocumentItem[];
  
  // Profile ID choices (specifically for Birth Certificate Request)
  idChoice?: "PROFILE" | "UPLOAD";
  onIdChoiceChange?: (choice: "PROFILE" | "UPLOAD") => void;
  residentData?: any;
  hasProfileId?: boolean;
  onViewProfileId?: (side: "front" | "back") => void;

  children?: React.ReactNode;
  className?: string;
}

export default function RequiredDocuments({
  title = "Required Documents",
  subtitle = "Please upload the required files to proceed",
  errorText,
  warningBanner,
  documents = [],
  idChoice,
  onIdChoiceChange,
  residentData,
  hasProfileId = false,
  onViewProfileId,
  children,
  className
}: RequiredDocumentsProps) {
  return (
    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col", className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 font-medium italic">{subtitle}</p>
      </div>

      {/* Warning Banner */}
      {warningBanner && (
        <div className="w-full">
          {warningBanner}
        </div>
      )}

      {/* Error text block */}
      {errorText && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-semibold text-red-700 dark:text-red-400 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorText}
        </div>
      )}

      {/* Profile ID Tabs (for birth-certificate-request) */}
      {residentData && onIdChoiceChange && idChoice && (
        <div className="flex gap-4 max-w-md">
          <button
            type="button"
            onClick={() => onIdChoiceChange("PROFILE")}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl border text-center font-bold text-xs uppercase tracking-wider transition-all",
              idChoice === "PROFILE"
                ? "border-theme-primary bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
            )}
          >
            Use Profile ID
          </button>
          <button
            type="button"
            onClick={() => onIdChoiceChange("UPLOAD")}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl border text-center font-bold text-xs uppercase tracking-wider transition-all",
              idChoice === "UPLOAD"
                ? "border-theme-primary bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
            )}
          >
            Upload New ID Copy
          </button>
        </div>
      )}

      {/* Profile ID Display (if chosen) */}
      {idChoice === "PROFILE" && residentData && (
        <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 text-center space-y-6">
          {hasProfileId ? (
            <div className="space-y-6">
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">Valid ID Photo on Profile</p>
              
              <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Front Side */}
                <div className="space-y-2">
                  <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Front Side</p>
                  {residentData.idFrontUrl ? (
                    <div
                      className="relative aspect-[1.586/1] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-white/[0.02] cursor-pointer hover:opacity-90 group transition-all"
                      onClick={() => onViewProfileId?.("front")}
                    >
                      <img src={residentData.idFrontUrl} alt="Resident Valid ID Front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center aspect-[1.586/1] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/30 dark:bg-white/[0.02] py-8">
                      <FileWarning className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">No Front ID Found</p>
                    </div>
                  )}
                </div>

                {/* Back Side */}
                <div className="space-y-2">
                  <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Back Side</p>
                  {residentData.idBackUrl ? (
                    <div
                      className="relative aspect-[1.586/1] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-white/[0.02] cursor-pointer hover:opacity-90 group transition-all"
                      onClick={() => onViewProfileId?.("back")}
                    >
                      <img src={residentData.idBackUrl} alt="Resident Valid ID Back" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center aspect-[1.586/1] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/30 dark:bg-white/[0.02] py-8">
                      <FileWarning className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">No Back ID Found</p>
                    </div>
                  )}
                </div>
              </div>

              {residentData.idFrontUrl && residentData.idBackUrl ? (
                <p className="text-theme-primary text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-theme-primary shrink-0" /> Verified Profile ID Selected
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest text-[10px]">Missing Front or Back ID on Profile</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Please choose &quot;Upload New ID Copy&quot; to upload both sides of your ID.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <FileWarning className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest text-xs">No Profile ID Found</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">Please choose &quot;Upload New ID Copy&quot; to upload your ID photo.</p>
            </div>
          )}
        </div>
      )}

      {/* Upload cards grid (renders when not using Profile ID or if documents are general) */}
      {(idChoice !== "PROFILE" || !residentData) && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <PremiumDocumentUpload
              key={doc.key}
              id={doc.key}
              label={doc.label}
              required={true}
              file={doc.file}
              previewUrl={doc.previewUrl}
              infoText={doc.infoText || "PDF / IMAGE (MAX 5MB)"}
              error={doc.error}
              onFileSelect={doc.onFileSelect}
              onClickUpload={doc.onClickUpload}
              onClear={doc.onClear}
              onView={doc.onView}
            />
          ))}
        </div>
      )}

      {/* Children slot (for custom evidence sections / check-boxes) */}
      {children}
    </div>
  );
}
