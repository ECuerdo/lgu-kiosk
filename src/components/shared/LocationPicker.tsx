"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { LocationPickerInnerProps } from "./LocationPickerInner";

function MapLoading() {
  return (
    <div className="w-full h-[350px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-white/10">
      <Loader2 className="w-8 h-8 text-theme-primary animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Loading Picker Map...</p>
    </div>
  );
}

// Dynamically import the real Leaflet component, turning off SSR
const LocationPickerInner = dynamic<LocationPickerInnerProps>(
  () => import("./LocationPickerInner"),
  {
    ssr: false,
    loading: () => <MapLoading />
  }
);

export default function LocationPicker(props: LocationPickerInnerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <MapLoading />;

  return <LocationPickerInner {...props} />;
}
