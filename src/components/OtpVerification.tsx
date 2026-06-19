"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface OtpVerificationProps {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OtpVerification({ email, onSuccess, onCancel }: OtpVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.value !== "" && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = useCallback(async () => {
    const code = otp.join("");
    if (code.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, onSuccess, otp]);

  useEffect(() => {
    if (otp.join("").length === 6) {
      verifyOtp();
    }
  }, [otp, verifyOtp]);

  useEffect(() => {
    // Auto focus the first input when the component mounts
    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const countdown = window.setInterval(() => {
      setResendCooldown(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [resendCooldown]);

  const resendOtp = async () => {
    if (resending || resendCooldown > 0) return;

    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to resend the code.");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(30);
      setMessage("A new verification code was sent to your email.");
      inputs.current[0]?.focus();
    } catch {
      setError("Unable to resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-theme-secondary/10 text-theme-secondary">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">Check Your Email</h3>
      <p className="text-white/60 mb-8 text-center">
        We&apos;ve sent a 6-digit code to <span className="text-white font-medium">{email}</span>
      </p>

      <div className="flex gap-3 mb-8">
        {otp.map((data, index) => (
          <input
            key={index}
            ref={(el) => { inputs.current[index] = el; }}
            type="text"
            maxLength={1}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="h-14 w-12 rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-bold text-white focus:border-theme-secondary focus:outline-none focus:ring-1 focus:ring-theme-secondary"
          />
        ))}
      </div>

      {error && <p className="mb-6 text-red-400 font-medium">{error}</p>}
      {message && <p className="mb-6 text-emerald-400 font-medium">{message}</p>}

      <div className="flex w-full gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white/5 py-3 font-semibold text-white/60 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button 
          onClick={verifyOtp}
          disabled={loading || otp.join("").length < 6}
          className="flex-[2] rounded-xl bg-theme-secondary py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      </div>
      
      <button
        type="button"
        onClick={resendOtp}
        disabled={resending || resendCooldown > 0}
        className="mt-8 font-medium text-theme-secondary hover:underline disabled:cursor-not-allowed disabled:text-white/30 disabled:no-underline"
      >
        {resending
          ? "Sending..."
          : resendCooldown > 0
            ? `Resend Code in ${resendCooldown}s`
            : "Resend Code"}
      </button>
    </div>
  );
}
