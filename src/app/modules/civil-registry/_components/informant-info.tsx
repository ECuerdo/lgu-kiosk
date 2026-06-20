import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface InformantInfoProps {
    // Read-only values (usually from resident profile)
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    birthDate?: string;
    age?: string;
    civilStatus?: string;
    citizenship?: string;
    address?: string; // Optional (only birth-psa-endorsement has address in step 1)

    // Controlled inputs
    relationship: string;
    relationshipSpecify?: string;
    occupation: string;
    contactNumber: string;
    email?: string; // Optional (only birth-certificate-request collects email here)

    // Change Handlers
    onRelationshipChange: (value: string) => void;
    onRelationshipSpecifyChange?: (value: string) => void;
    onOccupationChange: (value: string) => void;
    onContactNumberChange: (value: string) => void;
    onEmailChange?: (value: string) => void; // Optional

    // Selection Options
    relationshipOptions: string[] | { value: string; label: string }[];

    // Validation / Visual states
    errors?: Record<string, string>;
    showErrors?: boolean;

    // Visual options
    isCardWrapped?: boolean;
    cardTitle?: string;
    cardSubtitle?: string;
}

export default function InformantInfo({
    firstName = "",
    middleName = "",
    lastName = "",
    suffix = "",
    birthDate = "",
    age = "",
    civilStatus = "",
    citizenship = "",
    address,
    relationship,
    relationshipSpecify = "",
    occupation,
    contactNumber,
    email,
    onRelationshipChange,
    onRelationshipSpecifyChange,
    onOccupationChange,
    onContactNumberChange,
    onEmailChange,
    relationshipOptions,
    errors = {},
    showErrors = false,
    isCardWrapped = false,
    cardTitle = "Informant Information",
    cardSubtitle = "Person filing this request"
}: InformantInfoProps) {

    const formatBirthDate = (dateStr: string) => {
        if (!dateStr) return "";
        try {
            // Check if already formatted as MM/DD/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                return dateStr;
            }
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const yyyy = String(d.getFullYear()).padStart(4, "0");
            return `${mm}/${dd}/${yyyy}`;
        } catch {
            return dateStr;
        }
    };

    const hasRelationshipError = showErrors && (errors.relationship || !relationship);
    const hasContactNumberError = showErrors && (errors.contactNumber || !contactNumber);
    const hasSpecifyError = showErrors && relationshipSpecify === "" && (relationship === "OTHER" || relationship === "Guardian / Authorized Representative");

    const fieldsGrid = (
        <div className="space-y-6">
            {/* Relationship Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                        Relationship to Subject <span className="text-red-500">*</span>
                    </Label>
                    <Select value={relationship} onValueChange={onRelationshipChange}>
                        <SelectTrigger
                            id="relationship"
                            className={cn(
                                "rounded-2xl border-slate-200 dark:border-white/10 h-12 text-slate-900 dark:text-white font-black uppercase italic bg-slate-50/20 dark:bg-black/20 backdrop-blur-md transition-all hover:border-theme-primary/45 focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/15 shadow-sm",
                                hasRelationshipError && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            )}
                        >
                            <SelectValue placeholder="Select relationship..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 dark:bg-[#0d120f]/95 border-slate-200/85 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl mt-2 max-h-60 overflow-y-auto">
                            {relationshipOptions.map((opt) => {
                                const val = typeof opt === "string" ? opt : opt.value;
                                const lbl = typeof opt === "string" ? opt : opt.label;
                                return (
                                    <SelectItem
                                        key={val}
                                        value={val}
                                        className="focus:bg-theme-primary focus:text-white hover:bg-theme-primary/10 dark:hover:bg-theme-primary/15 font-black uppercase text-xs tracking-wider transition-colors"
                                    >
                                        {lbl}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    {hasRelationshipError && (
                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">
                            {errors.relationship || "Required"}
                        </p>
                    )}
                </div>

                {(relationship === "OTHER" || relationship === "Guardian / Authorized Representative") && onRelationshipSpecifyChange ? (
                    <div className="space-y-2 col-span-2 animate-in fade-in duration-200">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                            Specify Relationship <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="relationshipSpecify"
                            value={relationshipSpecify}
                            onChange={(e) => onRelationshipSpecifyChange(e.target.value)}
                            placeholder="E.g., Grandparent, Sibling..."
                            className={cn(
                                "rounded-2xl border-slate-200 dark:border-white/10 h-12 text-slate-900 dark:text-white font-black uppercase italic bg-slate-50/20 dark:bg-black/20 backdrop-blur-md transition-all hover:border-theme-primary/45 focus-visible:border-theme-primary focus-visible:ring-theme-primary/25 focus-visible:ring-[3px] shadow-sm",
                                hasSpecifyError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                            )}
                        />
                        {hasSpecifyError && (
                            <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">
                                {errors.relationshipSpecify || "Required"}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="hidden md:block col-span-2" />
                )}
            </div>

            {/* Read-Only Informant Profile Names */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { val: firstName, label: "First Name" },
                    { val: middleName, label: "Middle Name" },
                    { val: lastName, label: "Last Name" },
                    { val: suffix, label: "Suffix" },
                ].map(({ val, label }) => (
                    <div key={label} className="space-y-2 col-span-1">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                            {label}
                        </Label>
                        <Input
                            value={val}
                            readOnly
                            className="bg-slate-50/10 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase italic rounded-2xl h-12 cursor-not-allowed opacity-60"
                        />
                    </div>
                ))}
            </div>

            {/* Read-Only Informant Profile Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { val: formatBirthDate(birthDate), label: "Birth Date" },
                    { val: age, label: "Age" },
                    { val: civilStatus, label: "Civil Status" },
                    { val: citizenship, label: "Citizenship" },
                ].map(({ val, label }) => (
                    <div key={label} className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                            {label}
                        </Label>
                        <Input
                            value={val}
                            readOnly
                            className="bg-slate-50/10 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase italic rounded-2xl h-12 cursor-not-allowed opacity-60"
                        />
                    </div>
                ))}
            </div>

            {/* Optional Address (Only in birth-psa-endorsement step 1) */}
            {address !== undefined && (
                <div className="space-y-2">
                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                        Informant Address
                    </Label>
                    <Input
                        value={address}
                        readOnly
                        className="bg-slate-50/10 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase italic rounded-2xl h-12 cursor-not-allowed opacity-60"
                    />
                </div>
            )}

            {/* Occupation and Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                        Occupation
                    </Label>
                    <Input
                        id="occupation"
                        value={occupation}
                        onChange={(e) => onOccupationChange(e.target.value.toUpperCase())}
                        placeholder="Enter occupation"
                        className="rounded-2xl border-slate-200 dark:border-white/10 h-12 text-slate-900 dark:text-white font-black uppercase italic bg-slate-50/20 dark:bg-black/20 backdrop-blur-md transition-all hover:border-theme-primary/45 focus-visible:border-theme-primary focus-visible:ring-theme-primary/25 focus-visible:ring-[3px] shadow-sm placeholder:text-slate-500"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                        Contact Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="contactNumber"
                        name="contactNumber"
                        value={contactNumber}
                        onChange={(e) => onContactNumberChange(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="E.g., 09XXXXXXXXX"
                        className={cn(
                            "rounded-2xl border-slate-200 dark:border-white/10 h-12 text-slate-900 dark:text-white font-black uppercase italic bg-slate-50/20 dark:bg-black/20 backdrop-blur-md transition-all hover:border-theme-primary/45 focus-visible:border-theme-primary focus-visible:ring-theme-primary/25 focus-visible:ring-[3px] shadow-sm placeholder:text-slate-500",
                            hasContactNumberError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                        )}
                    />
                    {hasContactNumberError && (
                        <p className="text-[9px] font-black text-red-500 uppercase italic tracking-widest ml-1 animate-pulse">
                            {errors.contactNumber || "Required"}
                        </p>
                    )}
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wider italic text-amber-500 mt-2 leading-normal">
                        * NOTE: PLEASE USE YOUR ACTIVE CONTACT NUMBER. THIS WILL BE USED TO CONTACT YOU REGARDING YOUR TRANSACTION.
                    </p>
                </div>
            </div>

            {/* Optional Email Field (Only in birth-certificate-request step 1) */}
            {email !== undefined && onEmailChange !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-wider italic text-slate-400 dark:text-slate-500 ml-1">
                            Email Address (Optional)
                        </Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="Enter email address"
                            className="rounded-2xl border-slate-200 dark:border-white/10 h-12 text-slate-900 dark:text-white font-black uppercase italic bg-slate-50/20 dark:bg-black/20 backdrop-blur-md transition-all hover:border-theme-primary/45 focus-visible:border-theme-primary focus-visible:ring-theme-primary/25 focus-visible:ring-[3px] shadow-sm placeholder:text-slate-500"
                        />
                    </div>
                    <div className="hidden md:block" />
                </div>
            )}
        </div>
    );

    if (isCardWrapped) {
        return (
            <Card className="bg-white/40 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-theme-primary/30 space-y-8 overflow-visible">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            {cardTitle}
                        </h2>
                        {cardSubtitle && (
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {cardSubtitle}
                            </p>
                        )}
                    </div>
                </div>
                {fieldsGrid}
            </Card>
        );
    }

    return fieldsGrid;
}
