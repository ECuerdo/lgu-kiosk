/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Users, FileWarning, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RequestListProps {
    requests: any[];
    onItemClick: (app: any) => void;
    emptyMessage?: string;
    emptySubMessage?: string;
    getSubjectName: (app: any) => string;
}

const getBadgeStyles = (status: string, isCancelled?: boolean) => {
    if (isCancelled) {
        return "bg-red-500/20 text-red-400 border border-red-500/30";
    }
    switch (status) {
        case "PAID":
            return "bg-theme-primary/20 text-theme-primary border border-theme-primary/30";
        case "UNPAID":
        case "FOR_REVISION":
            return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
        case "FOR_REQUESTING":
            return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
        case "FOR_INSPECTION":
            return "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white";
        case "RELEASED":
            return "bg-theme-primary text-white";
        default:
            return "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white";
    }
};

export default function RequestList({
    requests,
    onItemClick,
    emptyMessage = "No records found",
    emptySubMessage = "Submit your first request to get started.",
    getSubjectName,
}: RequestListProps) {
    if (requests.length === 0) {
        return (
            <div className="text-center py-16 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem]">
                <FileWarning className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{emptyMessage}</p>
                <p className="text-slate-500 text-xs mt-1">{emptySubMessage}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {requests.map((app, idx) => {
                const subName = getSubjectName(app);
                const displayStatus = app.isCancelled ? "CANCELLED" : app.status;

                return (
                    <div
                        key={app.id || idx}
                        onClick={() => onItemClick(app)}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:border-theme-primary/50 hover:bg-slate-100 dark:hover:bg-theme-primary/[0.02] transition-all duration-300 gap-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0">
                                <Users className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-lg font-black tracking-tight">{subName}</span>
                                    <Badge className={cn("text-[9px] font-black uppercase py-0.5 px-2 rounded-full", getBadgeStyles(app.status, app.isCancelled))}>
                                        {displayStatus}
                                    </Badge>
                                </div>
                                {app.createdAt && (
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">
                                        Date: {new Date(app.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                                    </p>
                                )}
                                <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black mt-0.5">
                                    ID: {app.id}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <span className="text-[10px] font-black uppercase text-theme-primary tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                View Request <ChevronRight size={14} />
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
