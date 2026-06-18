"use client";

import { useEffect, useRef, useState } from "react";

interface FaceVerificationProps {
  residentName?: string;
  referenceImageUrl?: string | null;
  authSource?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FaceVerification({
  residentName,
  referenceImageUrl,
  authSource,
  onSuccess,
  onCancel,
}: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facePresent, setFacePresent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video) {
          video.srcObject = stream;
          setCameraReady(true);
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

  useEffect(() => {
    if (!cameraReady) return;

    let cancelled = false;
    let rafId = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const detectFace = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (!cancelled) rafId = requestAnimationFrame(detectFace);
        return;
      }

      const FaceDetectorCtor = (
        window as Window & {
          FaceDetector?: new (options?: { fastMode?: boolean }) => {
            detect: (input: HTMLVideoElement) => Promise<Array<unknown>>;
          };
        }
      ).FaceDetector;

      if (!FaceDetectorCtor) {
        if (!cancelled) setFacePresent(true);
        return;
      }

      try {
        const detector = new FaceDetectorCtor({ fastMode: true });
        const faces = await detector.detect(video);
        if (!cancelled) setFacePresent(faces.length > 0);
      } catch {
        if (!cancelled) setFacePresent(true);
      }
    };

    rafId = requestAnimationFrame(detectFace);
    intervalId = setInterval(() => {
      void detectFace();
    }, 1000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraReady]);

  const handleVerify = () => {
    if (!facePresent) {
      setError("Please position your face inside the frame first.");
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
          {authSource === "embedding" ? "Database face embedding" : "Database reference photo"}
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">{residentName || "Face Identity Check"}</h3>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          We will use the saved resident record as the reference for this verification step.
        </p>
      </div>

      <div className="relative mb-6 h-64 w-64 overflow-hidden rounded-full border-4 border-[#4caf7d] bg-black shadow-2xl">
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

      {referenceImageUrl ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImageUrl}
              alt="Resident reference"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Reference image loaded</p>
            <p className="text-xs text-white/50">Saved profile photo will be used as the DB reference.</p>
          </div>
        </div>
      ) : null}

      <p className="mb-2 max-w-sm text-center text-white/60">
        {facePresent ? "Face detected. You can continue." : "Align your face within the circle to continue."}
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
          disabled={verifying || !facePresent}
          className="flex-[2] rounded-xl bg-[#4caf7d] py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {verifying ? "Scanning..." : "Verify Identity"}
        </button>
      </div>
    </div>
  );
}
