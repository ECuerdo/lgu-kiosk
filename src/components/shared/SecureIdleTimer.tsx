"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SecureIdleTimerProps {
    timeoutSeconds?: number; // Default: 300s (5 minutes)
    warningSeconds?: number; // Default: 240s (4 minutes)
    themeColor?: string;     // Default: "var(--primary-theme)"
}

const AUTO_LOGOUT_ENABLED =
    process.env.NEXT_PUBLIC_ENABLE_SERVICE_AUTO_LOGOUT?.toLowerCase() === "true";

export default function SecureIdleTimer({
    timeoutSeconds = 300,
    warningSeconds = 240,
    themeColor = "var(--primary-theme)"
}: SecureIdleTimerProps) {
    const [idleTime, setIdleTime] = useState(0);
    const [showIdleModal, setShowIdleModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!AUTO_LOGOUT_ENABLED) return;

        const interval = setInterval(() => {
            setIdleTime(prev => {
                const nextTime = prev + 1;
                if (nextTime === warningSeconds) {
                    setShowIdleModal(true);
                }
                if (nextTime >= timeoutSeconds) {
                    clearInterval(interval);
                    sessionStorage.removeItem("active_resident");
                    setTimeout(() => {
                        router.replace("/");
                    }, 0);
                    toast.warning(`Securely signed out due to ${Math.floor(timeoutSeconds / 60)} minutes of inactivity.`);
                }
                return nextTime;
            });
        }, 1000);

        const resetTimer = () => {
            setIdleTime(0);
            setShowIdleModal(false);
        };

        window.addEventListener("mousemove", resetTimer);
        window.addEventListener("keydown", resetTimer);
        window.addEventListener("scroll", resetTimer);
        window.addEventListener("click", resetTimer);

        return () => {
            clearInterval(interval);
            window.removeEventListener("mousemove", resetTimer);
            window.removeEventListener("keydown", resetTimer);
            window.removeEventListener("scroll", resetTimer);
            window.removeEventListener("click", resetTimer);
        };
    }, [router, timeoutSeconds, warningSeconds]);

    if (!AUTO_LOGOUT_ENABLED) {
        return null;
    }

    return (
        <AnimatePresence>
            {showIdleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 15 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="bg-white dark:bg-[#0c0d12] border border-slate-100 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden z-10"
                    >
                        <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-[60px] rounded-full opacity-20 pointer-events-none"
                            style={{ backgroundColor: themeColor }}
                        />
                        <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border-2 animate-bounce shrink-0"
                            style={{ 
                                backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`, 
                                borderColor: themeColor, 
                                color: themeColor 
                            }}
                        >
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                Inactivity Warning
                            </h3>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Are you still there? You will be securely signed out in{" "}
                                <span className="font-extrabold italic" style={{ color: themeColor }}>
                                    {timeoutSeconds - idleTime}s
                                </span>{" "}
                                due to municipal safety compliance.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
