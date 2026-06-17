import { NextRequest, NextResponse } from "next/server";
import { createHandoffToken } from "@/lib/secure-upload-handoff";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId, slot } = await request.json();
    const allowed = ["tct", "documents", "bfp", "zoning"];
    if (!userId || !(allowed.includes(slot) || String(slot).startsWith("bp_"))) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }

    const { token, expiresAt } = createHandoffToken(String(userId), slot);
    const publicOrigin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const uploadUrl = new URL(`/upload-handoff/${encodeURIComponent(token)}`, publicOrigin);
    return NextResponse.json({ token, uploadUrl: uploadUrl.toString(), expiresAt });
  } catch (error) {
    console.error("Create upload handoff error:", error);
    return NextResponse.json({ error: "Unable to create secure upload handoff." }, { status: 500 });
  }
}
