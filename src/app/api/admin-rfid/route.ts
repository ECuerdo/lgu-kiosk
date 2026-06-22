import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("card");

  if (!cardId || cardId.trim() === "") {
    return NextResponse.json({ error: "No card ID provided" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        email: string | null;
        role: string;
      }>
    >(Prisma.sql`
      SELECT id, name, email, role
      FROM "User"
      WHERE rfid = ${cardId.trim()}
      LIMIT 1
    `);

    const user = rows[0] || null;

    if (!user) {
      return NextResponse.json(
        { error: "Card not recognized. Please register at the front desk." },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only ADMIN cards can unlock the kiosk." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      resident: {
        id: user.id,
        fullName: user.name || "Admin User",
        firstName: user.name?.split(" ")[0] || "Admin",
        barangay: null,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[/api/admin-rfid] DB error:", err);
    return NextResponse.json(
      { error: "Could not verify card. Please try again." },
      { status: 500 }
    );
  }
}
