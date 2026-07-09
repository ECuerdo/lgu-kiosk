"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
      descriptor?: number[];
      embedding?: number[];
      model?: string;
      verifiedAt?: string;
    }
  | string
  | null
  | undefined;

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
const MATCH_THRESHOLD = 0.5;

function isFaceRecognitionObject(
  input: unknown
): input is {
  mode?: "reference_image" | "embedding" | "liveness";
  referenceImageUrl?: string;
  selfieUrl?: string;
  descriptor?: number[];
  embedding?: number[];
  model?: string;
  verifiedAt?: string;
} {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function getRecognitionObject(input: unknown): Exclude<FacialRecognitionObject, string | null | undefined> | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as FacialRecognitionObject;
      return isFaceRecognitionObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (isFaceRecognitionObject(input)) return input;
  return null;
}

function toFloat32Array(values: number[]) {
  return new Float32Array(values);
}

async function loadImage(url: string) {
  const img = await faceapi.fetchImage(url);
  return img;
}

function preprocessImage(
  source: HTMLVideoElement | HTMLImageElement,
  filter: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || 640;
    canvas.height = source.videoHeight || 480;
  } else {
    canvas.width = source.width || 640;
    canvas.height = source.height || 480;
  }
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.filter = filter;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

async function detectReferenceFace(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  const configs = [
    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 }),
    new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.15 }), // Better for glasses/partial occlusion
    new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.15 }), // Higher detail fallback
  ];

  for (const options of configs) {
    const detection = await faceapi.detectSingleFace(img, options).withFaceLandmarks(true).withFaceDescriptor();
    if (detection) return detection;
  }

  if (img instanceof HTMLCanvasElement) {
    return null;
  }

  try {
    const canvasA = preprocessImage(img, "brightness(0.55) contrast(1.8) saturate(1.2) blur(0.8px)");
    for (const options of configs) {
      const detection = await faceapi.detectSingleFace(canvasA, options).withFaceLandmarks(true).withFaceDescriptor();
      if (detection) return detection;
    }
  } catch (e) {
    console.error("Preset A (anti-overexposure + anti-scanline) preprocessing failed:", e);
  }

  try {
    const canvasB = preprocessImage(img, "brightness(0.65) contrast(1.5) blur(0.5px)");
    for (const options of configs) {
      const detection = await faceapi.detectSingleFace(canvasB, options).withFaceLandmarks(true).withFaceDescriptor();
      if (detection) return detection;
    }
  } catch (e) {
    console.error("Preset B (moderate washout) preprocessing failed:", e);
  }

  try {
    const canvasC = preprocessImage(img, "brightness(1.25) contrast(1.3) saturate(1.05)");
    for (const options of configs) {
      const detection = await faceapi.detectSingleFace(canvasC, options).withFaceLandmarks(true).withFaceDescriptor();
      if (detection) return detection;
    }
  } catch (e) {
    console.error("Preset C (anti-backlight) preprocessing failed:", e);
  }

  return null;
}

function distance(p1: faceapi.Point, p2: faceapi.Point) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(eyePoints: faceapi.Point[]) {
  const d_vertical1 = distance(eyePoints[1], eyePoints[5]);
  const d_vertical2 = distance(eyePoints[2], eyePoints[4]);
  const d_horizontal = distance(eyePoints[0], eyePoints[3]);
  return (d_vertical1 + d_vertical2) / (2.0 * d_horizontal);
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
  const [matchState, setMatchState] = useState<"idle" | "matched" | "mismatch">("idle");
  const autoVerifyRef = useRef(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const eyeClosedRef = useRef(false);

  const earHistoryRef = useRef<number[]>([]);

  const recognition = useMemo(() => getRecognitionObject(facialRecognition), [facialRecognition]);

  useEffect(() => {
    let cancelled = false;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not access camera. Please check permissions."
          );
        }
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
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
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
    if (!modelsReady) return;

    let cancelled = false;

    async function loadReferenceDescriptor() {
      try {
        const savedDescriptor = recognition?.descriptor || recognition?.embedding || null;
        if (savedDescriptor && savedDescriptor.length > 0) {
          setReferenceDescriptor(toFloat32Array(savedDescriptor));
          setReferenceLabel(residentName || "Resident");
          setReferenceReady(true);
          return;
        }

        const url = recognition?.referenceImageUrl || recognition?.selfieUrl || referenceImageUrl || null;
        if (!url) {
          setError("No facialRecognition descriptor or reference image is available for this resident.");
          setReferenceReady(false);
          return;
        }

        const img = await loadImage(url);
        const detection = await detectReferenceFace(img);

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
  }, [modelsReady, recognition, referenceImageUrl, residentName]);

  useEffect(() => {
    if (!cameraReady || !modelsReady || !referenceReady) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const detectLiveFace = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        if (!cancelled) timeoutId = setTimeout(detectLiveFace, 150);
        return;
      }

      try {
        const result = await detectReferenceFace(video);

        if (!cancelled) {
          setLiveDescriptor(result?.descriptor || null);
          setMatchState("idle");
          autoVerifyRef.current = false;
          if (!result) {
            setError(null);
          } else {
            // Calculate EAR for blink/liveness detection
            const landmarks = result.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            
            const leftEAR = calculateEAR(leftEye);
            const rightEAR = calculateEAR(rightEye);
            const avgEAR = (leftEAR + rightEAR) / 2;

            // Keep history of last 15 frames for running average
            const history = earHistoryRef.current;
            history.push(avgEAR);
            if (history.length > 15) {
              history.shift();
            }

            // Exclude current frame for cleaner baseline baseline
            const prevFrames = history.slice(0, -1);
            const runningAvg = prevFrames.length > 0
              ? prevFrames.reduce((a, b) => a + b, 0) / prevFrames.length
              : avgEAR;

            console.log(
              `[Liveness] EAR: ${avgEAR.toFixed(3)} | Baseline: ${runningAvg.toFixed(3)} | Ratio: ${(avgEAR / runningAvg).toFixed(2)} | Closed State: ${eyeClosedRef.current}`
            );

            if (!livenessPassed && prevFrames.length >= 5) {
              // If EAR drops below 83% of the baseline, count eyes as closed
              if (avgEAR < runningAvg * 0.83) {
                eyeClosedRef.current = true;
              } 
              // If eyes were closed and now recovered to at least 92% of baseline
              else if (eyeClosedRef.current && avgEAR > runningAvg * 0.92) {
                setLivenessPassed(true);
                console.log("[Liveness] Blink detected! Liveness check passed.");
              }
            }
          }
        }
      } catch {
        if (!cancelled) setLiveDescriptor(null);
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(detectLiveFace, 150);
        }
      }
    };

    void detectLiveFace();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [cameraReady, modelsReady, referenceReady, livenessPassed]);

  const handleVerify = useCallback(() => {
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

    if (referenceDescriptor.length !== liveDescriptor.length) {
      setMatchState("mismatch");
      setError(
        `Face descriptor length mismatch (${liveDescriptor.length} live vs ${referenceDescriptor.length} saved). Please re-enroll this resident's facialRecognition data.`
      );
      return;
    }

    const matcher = new faceapi.FaceMatcher(
      [new faceapi.LabeledFaceDescriptors(referenceLabel, [referenceDescriptor])],
      MATCH_THRESHOLD
    );
    const bestMatch = matcher.findBestMatch(liveDescriptor);

    if (bestMatch.label === "unknown") {
      setMatchState("mismatch");
      setError("Face does not match the saved resident record.");
      return;
    }

    setMatchState("matched");
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 900);
  }, [liveDescriptor, modelsReady, onSuccess, referenceDescriptor, referenceLabel, referenceReady]);

  useEffect(() => {
    if (!modelsReady || !referenceReady || !referenceDescriptor || !liveDescriptor || verifying || !livenessPassed) return;
    if (autoVerifyRef.current) return;

    autoVerifyRef.current = true;
    void handleVerify();
  }, [handleVerify, liveDescriptor, modelsReady, referenceDescriptor, referenceReady, verifying, livenessPassed]);

  const faceStatus = !modelsReady
    ? "Loading biometric models..."
    : !referenceReady
      ? "Preparing saved face reference..."
      : !livenessPassed
        ? (eyeClosedRef.current 
            ? "Eye closure detected! Now open your eyes..." 
            : "Please blink your eyes to verify liveness.")
        : matchState === "matched"
          ? "Face matched against the saved record."
          : matchState === "mismatch"
            ? "Face does not match the saved resident record."
            : liveDescriptor
              ? "Liveness verified. Verifying identity..."
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
          className="h-full w-full object-cover -scale-x-100"
        />
        <div className={`absolute inset-0 border-[20px] border-transparent transition-colors duration-300 ${
          livenessPassed 
            ? 'border-t-green-500/30' 
            : eyeClosedRef.current 
              ? 'border-t-yellow-500/30' 
              : 'border-t-theme-secondary/30'
        } animate-pulse`} />

        {/* Liveness badge inside video */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm border border-white/10">
          {livenessPassed ? "🟢 Live" : eyeClosedRef.current ? "🟡 Open Eyes" : "🔵 Blink"}
        </div>

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
          disabled={verifying || !liveDescriptor || !referenceReady || !modelsReady || !livenessPassed}
          className="flex-[2] rounded-xl bg-theme-secondary py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {verifying ? "Auto-verifying..." : "Verify Identity"}
        </button>
      </div>
    </div>
  );
}
