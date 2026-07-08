import React from "react";
import { Eye, FileText, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadOnlyDocumentPreviewProps {
    file: File | null;
    previewUrl: string | null;
    label: string;
    fileName?: string;
    onView?: () => void;
    className?: string;
}

const checkIsImage = (file: File | null, url: string | null) => {
    if (file && file.type) return file.type.startsWith("image/");
    if (url) {
        const cleanUrl = url.split("?")[0].toLowerCase();
        return (
            cleanUrl.endsWith(".png") ||
            cleanUrl.endsWith(".jpg") ||
            cleanUrl.endsWith(".jpeg") ||
            cleanUrl.endsWith(".webp") ||
            cleanUrl.endsWith(".gif") ||
            cleanUrl.endsWith(".avif")
        );
    }
    return false;
};

export default function ReadOnlyDocumentPreview({
    file,
    previewUrl,
    label,
    fileName,
    onView,
    className
}: ReadOnlyDocumentPreviewProps) {
    const hasFile = !!file || !!previewUrl;
    const isImage = checkIsImage(file, previewUrl);

    // Determine display name
    let displayFileName = fileName;
    if (!displayFileName) {
        if (file) {
            displayFileName = file.name;
        } else if (previewUrl) {
            displayFileName = "Uploaded document";
        } else {
            displayFileName = "Not uploaded";
        }
    }

    // Determine the source of the preview image safely
    let imageSrc = "";
    if (isImage) {
        if (previewUrl) {
            imageSrc = previewUrl;
        } else if (file) {
            try {
                imageSrc = URL.createObjectURL(file);
            } catch (e) {
                console.error("Failed to create object URL for file", e);
            }
        }
    }

    return (
        <div
            className={cn(
                "rounded-xl border overflow-hidden transition-all",
                hasFile
                    ? "bg-theme-primary/5 border-theme-primary/20 cursor-pointer hover:border-theme-primary/40 hover:shadow-lg group"
                    : "bg-red-50/10 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20",
                className
            )}
            onClick={() => {
                if (hasFile && onView) {
                    onView();
                }
            }}
        >
            {/* Image Preview Area */}
            {isImage && imageSrc ? (
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageSrc}
                        alt={label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                    </div>
                </div>
            ) : hasFile ? (
                <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-theme-primary/50" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                    </div>
                </div>
            ) : null}

            {/* Label and Status Row */}
            <div className="flex items-center gap-2.5 p-3">
                {hasFile ? (
                    <Check className="w-4 h-4 text-theme-primary shrink-0" />
                ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 truncate">
                        {label}
                    </p>
                    <p className="text-[8px] text-slate-400 italic truncate">
                        {displayFileName}
                    </p>
                </div>
            </div>
        </div>
    );
}
