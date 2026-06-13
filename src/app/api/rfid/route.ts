import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("card");

  if (!cardId || cardId.trim() === "") {
    return NextResponse.json({ error: "No card ID provided" }, { status: 400 });
  }

  try {
    const resident = await prisma.resident.findUnique({
      where: { rfid: cardId.trim() },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        barangay: true,
        imageUrl: true,
        livenessUrl: true,
        idFrontUrl: true,
        facialRecognition: true,
      },
    });

    if (!resident) {
      return NextResponse.json(
        { error: "Card not recognized. Please register at the front desk." },
        { status: 404 }
      );
    }

    const fullName = [resident.firstName, resident.middleName, resident.lastName]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({
      resident: {
        id: resident.id,
        userId: resident.userId,
        fullName,
        firstName: resident.firstName,
        photoUrl: resident.livenessUrl || resident.imageUrl || resident.idFrontUrl,
        barangay: resident.barangay,
        email: resident.email,
        hasFaceAuth: !!resident.facialRecognition,
      },
    });
  } catch (err) {
    console.error("[/api/rfid] DB error:", err);
    return NextResponse.json(
      { error: "Could not verify card. Please try again." },
      { status: 500 }
    );
  }
}
