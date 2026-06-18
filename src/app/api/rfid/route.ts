import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FacialRecognitionPayload =
  | string
  | {
      mode?: "reference_image" | "embedding" | "liveness";
      referenceImageUrl?: string;
      selfieUrl?: string;
      embedding?: number[];
      model?: string;
      verifiedAt?: string;
    };

function parseFacialRecognition(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as FacialRecognitionPayload;
    } catch {
      return { referenceImageUrl: value } as FacialRecognitionPayload;
    }
  }

  if (typeof value === "object") {
    return value as FacialRecognitionPayload;
  }

  return null;
}

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

    const facialRecognition = parseFacialRecognition(resident.facialRecognition);
    const facialRecognitionObject =
      facialRecognition && typeof facialRecognition === "object" && !Array.isArray(facialRecognition)
        ? facialRecognition
        : null;
    const faceReferenceUrl =
      (facialRecognitionObject
        ? facialRecognitionObject.referenceImageUrl || facialRecognitionObject.selfieUrl
        : null) ||
      resident.livenessUrl ||
      resident.imageUrl ||
      resident.idFrontUrl ||
      null;

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
        faceAuthSource: facialRecognitionObject?.mode || (faceReferenceUrl ? "reference_image" : null),
        faceReferenceUrl,
        facialRecognition,
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
