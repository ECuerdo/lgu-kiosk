"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";

const REQUIREMENTS = [
  "Barangay Clearance/Certification", "Tax Declaration", "Land Title",
  "Community Tax Certificate", "Latest Tax Receipts", "Adjoining Owners Confirmation",
  "Locational Clearance", "Affidavit of Consent", "Affidavit of Adjoining Owners",
  "Signed & Sealed Plans",
];
const PERMITS = [
  "Electrical Permit", "Plumbing Permit", "Sanitary Permit",
  "Excavation & Ground Preparation Permit", "Fencing Permit",
  "Scaffolding Permit", "Mechanical Permit",
];

type UploadedFile = { slot: string; fileName: string; url: string };

export default function UploadHandoffPage() {
  const params = useParams<{ token: string }>();
  const [sessionSlot, setSessionSlot] = useState("");
  const [uploaded, setUploaded] = useState<Record<string, UploadedFile>>({});
  const [uploadingSlot, setUploadingSlot] = useState("");
  const [message, setMessage] = useState("");

  const endpoint = `/api/upload-handoff/${encodeURIComponent(params.token)}`;

  async function refresh() {
    const response = await fetch(endpoint, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "This upload session is unavailable.");
      return;
    }
    setSessionSlot(result.sessionSlot);
    setUploaded(Object.fromEntries((result.files || []).map((file: UploadedFile) => [file.slot, file])));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  async function upload(slot: string, file: File) {
    setUploadingSlot(slot);
    setMessage("");
    const body = new FormData();
    body.append("slot", slot);
    body.append("file", file);
    const response = await fetch(endpoint, { method: "POST", body });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || "Upload failed.");
    else await refresh();
    setUploadingSlot("");
  }

  const slots = sessionSlot === "documents"
    ? [
        ...REQUIREMENTS
          .map((label, index) => ({ slot: `req_${index}`, label, group: "Requirements" }))
          .filter((_, index) => index !== 5),
        ...PERMITS.map((label, index) => ({ slot: `permit_${index}`, label, group: "Permits" })),
      ]
    : sessionSlot === "bfp"
      ? [{ slot: "bfp", label: "Fire Safety / BFP Clearance", group: "Clearance Document" }]
      : sessionSlot === "zoning"
        ? [{ slot: "zoning", label: "Zoning / Locational Clearance", group: "Clearance Document" }]
        : [{ slot: "tct", label: "Certified True Copy of TCT", group: "TCT Document" }];

  return (
    <main className="h-dvh overflow-y-auto bg-[#071c12] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3 text-[#1a6b3a]">
          <ShieldCheck className="h-9 w-9 shrink-0" />
          <div>
            <h1 className="text-xl font-black uppercase">Secure Document Upload</h1>
            <p className="text-xs font-semibold text-slate-500">PDF, JPG, PNG • 5MB each • Antivirus scanned</p>
          </div>
        </div>

        {message && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}

        <div className="space-y-3">
          {slots.map((item, index) => {
            const file = uploaded[item.slot];
            const showGroup = index === 0 || slots[index - 1]?.group !== item.group;
            return (
              <div key={item.slot}>
                {showGroup && <h2 className="mb-2 mt-5 text-xs font-black uppercase tracking-widest text-[#1a6b3a]">{item.group}</h2>}
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4">
                  <div className={file ? "text-emerald-500" : "text-slate-400"}>
                    {file ? <CheckCircle2 className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="truncate text-xs text-slate-400">
                      {uploadingSlot === item.slot ? "Scanning..." : file?.fileName || "Tap to choose file"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#1a6b3a] px-3 py-2 text-[10px] font-black uppercase text-white">
                    {file ? "Re-upload" : "Upload"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    disabled={!!uploadingSlot}
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (selected) void upload(item.slot, selected);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
