"use client";

import { useEffect, useRef, useState } from "react";

interface FaceVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FaceVerification({ onSuccess, onCancel }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video) {
          video.srcObject = stream;
        }
      } catch {
        setError("Could not access camera. Please check permissions.");
      }
    }
    setupCamera();

    return () => {
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleVerify = () => {
    setVerifying(true);
    // Simulate Face Recognition check
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative mb-8 h-64 w-64 overflow-hidden rounded-full border-4 border-[#4caf7d] bg-black shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="h-full w-full object-cover grayscale"
        />
        <div className="absolute inset-0 border-[20px] border-transparent border-t-[#4caf7d]/30 animate-pulse" />
        
        {verifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">Face Identity Check</h3>
      <p className="text-white/60 mb-8 text-center max-w-sm">
        Align your face within the circle to verify your identity.
      </p>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="flex w-full gap-4">
        <button 
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white/5 py-3 font-semibold text-white/60 transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button 
          onClick={handleVerify}
          disabled={verifying}
          className="flex-[2] rounded-xl bg-[#4caf7d] py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {verifying ? "Scanning..." : "Verify Identity"}
        </button>
      </div>
    </div>
  );
}
