"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceVerificationProps {
  residentName?: string;
  referenceImageUrl?: string | null;
  authSource?: string | null;
  facialRecognition?: unknown;
  onSuccess: () => void;
  onCancel: () => void;
}

type FacialRecognitionObject =
  | {
      mode?: "reference_image" | "embedding" | "liveness";
      referenceImageUrl?: string;
      selfieUrl?: string;
      embedding?: number[];
      model?: string;
      verifiedAt?: string;
    }
  | string
  | null
  | undefined;

const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const MATCH_THRESHOLD = 0.5;

function getRecognitionObject(input: unknown): Exclude<FacialRecognitionObject, string | null | undefined> | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as FacialRecognitionObject;
      return typeof parsed === "object" && parsed ? (parsed as any) : null;
    } catch {
      return null;
    }
  }
  if (typeof input === "object" && !Array.isArray(input)) return input as any;
  return null;
}

function toFloat32Array(values: number[]) {
  return new Float32Array(values);
}

async function loadImage(url: string) {
  const img = await faceapi.fetchImage(url);
  return img;
}

export default function FaceVerification({
  residentName,
  referenceImageUrl,
  authSource,
  facialRecognition,
  onSuccess,
  onCancel,
}: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [referenceReady, setReferenceReady] = useState(false);
  const [referenceLabel, setReferenceLabel] = useState<string>("Resident");
  const [liveDescriptor, setLiveDescriptor] = useState<Float32Array | null>(null);
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);

  const recognition = useMemo(() => getRecognitionObject(facialRecognition), [facialRecognition]);

  useEffect(() => {
    let cancelled = false;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch {
        setError("Could not access camera. Please check permissions.");
      }
    }

    void setupCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsReady(true);
      } catch {
        if (!cancelled) {
          setError("Face verification models could not be loaded.");
          setModelsReady(false);
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceDescriptor() {
      try {
        if (recognition?.embedding && recognition.embedding.length > 0) {
          setReferenceDescriptor(toFloat32Array(recognition.embedding));
          setReferenceLabel(residentName || "Resident");
          setReferenceReady(true);
          return;
        }

        const url = recognition?.referenceImageUrl || recognition?.selfieUrl || referenceImageUrl || null;
        if (!url) {
          setError("No saved face reference is available for this resident.");
          setReferenceReady(false);
          return;
        }

        const img = await loadImage(url);
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (!detection) {
          throw new Error("No face found in the saved reference image.");
        }

        if (!cancelled) {
          setReferenceDescriptor(detection.descriptor);
          setReferenceLabel(residentName || "Resident");
          setReferenceReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to prepare face reference.");
          setReferenceReady(false);
        }
      }
    }

    void loadReferenceDescriptor();
    return () => {
      cancelled = true;
    };
  }, [recognition, referenceImageUrl, residentName]);

  useEffect(() => {
    if (!cameraReady || !modelsReady || !referenceReady) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let rafId = 0;

    const detectLiveFace = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (!cancelled) rafId = requestAnimationFrame(detectLiveFace);
        return;
      }

      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (!cancelled) {
          setLiveDescriptor(result?.descriptor || null);
          if (!result) {
            setError(null);
          }
        }
      } catch {
        if (!cancelled) setLiveDescriptor(null);
      }
    };

    rafId = requestAnimationFrame(detectLiveFace);
    intervalId = setInterval(() => {
      void detectLiveFace();
    }, 1200);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraReady, modelsReady, referenceReady]);

  const handleVerify = () => {
    if (!modelsReady) {
      setError("Face verification models are not ready yet.");
      return;
    }

    if (!referenceReady || !referenceDescriptor) {
      setError("No saved face reference is available for this resident.");
      return;
    }

    if (!liveDescriptor) {
      setError("Please position your face inside the frame first.");
      return;
    }

    const matcher = new faceapi.FaceMatcher(
      [new faceapi.LabeledFaceDescriptors(referenceLabel, [referenceDescriptor])],
      MATCH_THRESHOLD
    );
    const bestMatch = matcher.findBestMatch(liveDescriptor);

    if (bestMatch.label === "unknown") {
      setError("Face does not match the saved resident record.");
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 900);
  };

  const faceStatus = !modelsReady
    ? "Loading biometric models..."
    : !referenceReady
      ? "Preparing saved face reference..."
      : liveDescriptor
        ? "Face matched against the saved record."
        : "Align your face within the circle to continue.";

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
          {authSource === "embedding" ? "Database face embedding" : "Database reference photo"}
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">{residentName || "Face Identity Check"}</h3>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          We compare your live face against the saved resident biometric record in the database.
        </p>
      </div>

      <div className="relative mb-6 h-64 w-64 overflow-hidden rounded-full border-4 border-theme-secondary bg-black shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover grayscale"
        />
        <div className="absolute inset-0 border-[20px] border-transparent border-t-theme-secondary/30 animate-pulse" />

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
            <img src={referenceImageUrl} alt="Resident reference" className="h-full w-full object-cover" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Reference image loaded</p>
            <p className="text-xs text-white/50">Saved profile photo or embedding is used as the database reference.</p>
          </div>
        </div>
      ) : null}

      <p className="mb-2 max-w-sm text-center text-white/60">{faceStatus}</p>

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
          disabled={verifying || !liveDescriptor || !referenceReady || !modelsReady}
          className="flex-[2] rounded-xl bg-theme-secondary py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {verifying ? "Scanning..." : "Verify Identity"}
        </button>
      </div>
    </div>
  );
}
