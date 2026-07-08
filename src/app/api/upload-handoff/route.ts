import { NextRequest, NextResponse } from "next/server";
import { createHandoffToken } from "@/lib/secure-upload-handoff";

export const runtime = "nodejs";

function normalizePublicOrigin(value: string | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, slot } = await request.json();
    const allowed = ["tct", "documents", "bfp", "zoning", "idFile", "proofFile", "birth_id"];
    if (!userId || !(allowed.includes(slot) || String(slot).startsWith("bp_") || String(slot).startsWith("lcr_"))) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }

    const { token, expiresAt } = createHandoffToken(String(userId), slot);
    const publicOrigin = normalizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL, request.nextUrl.origin);
    const uploadUrl = new URL(`/upload-handoff/${encodeURIComponent(token)}`, publicOrigin);
    return NextResponse.json({ token, uploadUrl: uploadUrl.toString(), expiresAt });
  } catch (error) {
    console.error("Create upload handoff error:", error);
    return NextResponse.json({ error: "Unable to create secure upload handoff." }, { status: 500 });
  }
}
