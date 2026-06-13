"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_SECONDS = 60;
const WARNING_SECONDS = 15;
const AUTO_LOGOUT_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_AUTO_LOGOUT?.toLowerCase() === "true";

export default function SecureIdleTimer() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(IDLE_TIMEOUT_SECONDS);
  const deadlineRef = useRef(0);

  const resetTimer = useCallback(() => {
    deadlineRef.current = Date.now() + IDLE_TIMEOUT_SECONDS * 1000;
    setSecondsLeft(IDLE_TIMEOUT_SECONDS);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("active_resident");
    window.speechSynthesis?.cancel();
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!AUTO_LOGOUT_ENABLED) return;

    deadlineRef.current = Date.now() + IDLE_TIMEOUT_SECONDS * 1000;

    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    const countdown = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) logout();
    }, 500);

    return () => {
      window.clearInterval(countdown);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [logout, resetTimer]);

  if (!AUTO_LOGOUT_ENABLED) return null;
  if (secondsLeft > WARNING_SECONDS) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock3 className="h-8 w-8" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">
          Session Timeout
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase text-slate-900">
          Are you still there?
        </h2>
        <p className="mt-3 text-sm font-medium text-slate-500">
          For your security, this service will automatically log out in{" "}
          <span className="font-black text-red-600">{secondsLeft} second{secondsLeft === 1 ? "" : "s"}</span>.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={logout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="flex-1 rounded-xl bg-[#1a6b3a] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg"
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
}
