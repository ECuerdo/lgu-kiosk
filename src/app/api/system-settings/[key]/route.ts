import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: decodeURIComponent(key) },
      select: { value: true },
    });

    return NextResponse.json({
      success: true,
      key: decodeURIComponent(key),
      value: setting?.value ?? null,
    });
  } catch (error) {
    console.error("System setting fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch system setting" }, { status: 500 });
  }
}
