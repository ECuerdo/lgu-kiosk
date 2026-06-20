"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── Get Current Resident ────────────────────────────────────────────────────
export async function getCurrentUserResident(userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const resident = await prisma.resident.findFirst({
      where: { userId: userId },
      include: { user: true }
    });
    return { success: true, data: resident };
  } catch (error) {
    console.error("Get current resident error:", error);
    return { success: false, error: "Failed to fetch resident profile" };
  }
}

// ─── Get System Setting ──────────────────────────────────────────────────────
export async function getSystemSettingAction(key: string) {
  try {
    const setting = await (prisma as any).systemSetting?.findUnique({
      where: { key }
    });
    return { success: true, data: setting?.value ?? null };
  } catch {
    return { success: true, data: null };
  }
}

// ─── Get Transaction By ID ───────────────────────────────────────────────────
export async function getTransactionById(id: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const tx = await prisma.transaction.findUnique({
      where: { id },
    });
    if (!tx || tx.userId !== userId) return { success: false, error: "Transaction not found" };
    return { success: true, data: tx };
  } catch (error) {
    console.error("Get transaction by id error:", error);
    return { success: false, error: "Failed to fetch transaction" };
  }
}

// ─── Get Barangays List ──────────────────────────────────────────────────────
export async function getBarangaysList() {
  try {
    const barangays = await prisma.barangayInfo.findMany({
      select: { name: true },
      orderBy: { name: "asc" }
    });
    return { success: true, data: barangays.map((b) => b.name) };
  } catch (error) {
    console.error("Get barangays error:", error);
    return { success: false, data: [] as string[] };
  }
}

// ─── Get Existing Death Certificate Requests ───────────────────────────────
export async function getExistingDeathCertificateRequests(userId: string) {
  try {
    if (!userId) return { success: false, data: [] };

    const type = await prisma.transactionType.findFirst({
      where: { code: "LCR_DEATH" }
    });

    if (!type) return { success: false, data: [] };

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        typeId: type.id
      },
      include: {
        deathCertificateRequest: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching existing death certificate requests:", error);
    return { success: false, data: [] };
  }
}

// ─── Cancel Transaction ──────────────────────────────────────────────────────
export async function cancelTransaction(id: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const tx = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!tx) return { success: false, error: "Transaction not found" };
    if (tx.userId !== userId) return { success: false, error: "Forbidden" };
    if (tx.isCancelled) return { success: false, error: "This request is already cancelled." };

    const restrictedStatuses = [
      "FOR_PROCESSING",
      "EVALUATED",
      "FOR_CLAIM",
      "FOR_PICKING",
      "IN_ROUTE",
      "DELIVERED",
      "UNPAID",
      "PAID",
      "RELEASED",
      "REJECTED"
    ];
    if (restrictedStatuses.includes(tx.status)) {
      return { success: false, error: "Cannot cancel transaction at this stage. Please contact support." };
    }

    await prisma.transaction.update({
      where: { id },
      data: { isCancelled: true }
    });

    revalidatePath("/modules/civil-registry/death-certificate-request");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Cancel transaction error:", error);
    return { success: false, error: "Failed to cancel transaction" };
  }
}

// ─── Submit Death Certificate Request ────────────────────────────────────────
export async function submitDeathCertificateRequest(formData: FormData, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    // Get LCR_DEATH Transaction Type
    const type = await prisma.transactionType.findFirst({
      where: { code: "LCR_DEATH" }
    });

    if (!type) {
      return { success: false, error: "Death Certificate transaction type not found in database." };
    }

    // Extract fields
    const deceasedFirstName = formData.get("deceasedFirstName") as string;
    const deceasedMiddleName = formData.get("deceasedMiddleName") as string;
    const deceasedLastName = formData.get("deceasedLastName") as string;
    const deceasedSuffix = formData.get("deceasedSuffix") as string;
    const dateOfEventStr = formData.get("dateOfDeath") as string;
    const placeOfEvent = formData.get("placeOfDeath") as string;
    const causeOfDeath = formData.get("causeOfDeath") as string;
    const fatherFirstName = formData.get("fatherFirstName") as string;
    const fatherMiddleName = formData.get("fatherMiddleName") as string;
    const fatherLastName = formData.get("fatherLastName") as string;
    const motherFirstName = formData.get("motherFirstName") as string;
    const motherMiddleName = formData.get("motherMiddleName") as string;
    const motherLastName = formData.get("motherLastName") as string;
    const registryNumber = formData.get("registryNumber") as string;
    const relation = formData.get("relation") as string;
    const contactNumber = formData.get("contactNumber") as string;
    const email = formData.get("email") as string;
    const occupation = formData.get("occupation") as string;
    const privacyConsentAccepted = formData.get("privacyConsentAccepted") === "true";
    const revisionId = formData.get("revisionId") as string | null;

    if (!deceasedFirstName || !deceasedLastName || !dateOfEventStr || !placeOfEvent) {
      return { success: false, error: "Please fill in all required fields." };
    }

    const dateOfEvent = new Date(dateOfEventStr);
    const subjectName = `${deceasedFirstName} ${deceasedMiddleName ? deceasedMiddleName + ' ' : ''}${deceasedLastName}${deceasedSuffix ? ' ' + deceasedSuffix : ''}`.trim();
    const fatherName = `${fatherFirstName} ${fatherMiddleName ? fatherMiddleName + ' ' : ''}${fatherLastName}`.trim() || "N/A";
    const motherName = `${motherFirstName} ${motherMiddleName ? motherMiddleName + ' ' : ''}${motherLastName}`.trim() || "N/A";

    const additionalData: any = {
      deceasedFirstName,
      deceasedMiddleName,
      deceasedLastName,
      deceasedSuffix,
      subjectName,
      dateOfEvent: dateOfEventStr,
      placeOfEvent,
      causeOfDeath,
      fatherFirstName,
      fatherMiddleName,
      fatherLastName,
      fatherName,
      motherFirstName,
      motherMiddleName,
      motherLastName,
      motherName,
      registryNumber,
      relation,
      contactNumber,
      email,
      occupation,
      privacyConsentAccepted,
      privacyConsentAcceptedAt: privacyConsentAccepted ? new Date().toISOString() : null,
      documents: {}
    };

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `death-certificates/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");

    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    if (revisionId) {
      const existing = await prisma.transaction.findUnique({
        where: { id: revisionId }
      });
      if (!existing || existing.userId !== userId) {
        return { success: false, error: "Transaction not found or unauthorized" };
      }

      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: revisionId },
          data: {
            status: "FOR_INSPECTION",
            isCancelled: false,
            additionalData: additionalData,
            residentSnapshot: resident ? (resident as any) : {},
            totalAmount: type.baseFee
          }
        }),
        prisma.deathCertificateRequest.update({
          where: { transactionId: revisionId },
          data: {
            subjectName,
            dateOfEvent,
            placeOfEvent,
            fatherName: fatherName || null,
            motherName: motherName || null,
            registryNumber: registryNumber || null,
            issuedBy: "Kiosk Pending Review"
          }
        })
      ]);

      revalidatePath("/dashboard");
      return { success: true, transactionId: revisionId };
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        typeId: type.id,
        status: "FOR_INSPECTION",
        residentSnapshot: resident ? (resident as any) : {},
        additionalData: additionalData,
        totalAmount: type.baseFee,
        deathCertificateRequest: {
          create: {
            subjectName,
            dateOfEvent,
            placeOfEvent,
            fatherName: fatherName || null,
            motherName: motherName || null,
            registryNumber: registryNumber || null,
            issuedBy: "Kiosk Pending Review",
          }
        }
      }
    });

    revalidatePath("/dashboard");
    return { success: true, transactionId: transaction.id };

  } catch (error) {
    console.error("Submit Death Certificate Request Error:", error);
    return { success: false, error: "Failed to submit Death Certificate request." };
  }
}

// ─── Get Secure Upload URL ───────────────────────────────────────────────────
export async function getSecureUploadUrlAction(fieldName: string, folder: string, fileExt: string, userId: string) {
  try {
    if (!userId) return { success: false as const, error: "Unauthorized" };

    const sanitizedField = fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const path = `${folder}/${userId}/${sanitizedField}-${timestamp}.${fileExt}`;
    const bucket = "system-assets";

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      return { success: false as const, error: error?.message || "Failed to create signed URL" };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return { success: true as const, signedUrl: data.signedUrl, publicUrl };
  } catch (error) {
    console.error("Get secure upload URL error:", error);
    return { success: false as const, error: "Upload service unavailable" };
  }
}

// ─── Search Residents Action ────────────────────────────────────────────────
export async function searchResidentsAction(query: string) {
  try {
    if (!query || query.trim().length < 2) return { success: true, data: [] };

    const normalizedQuery = query.trim();

    const residents = await prisma.resident.findMany({
      where: {
        OR: [
          { firstName: { contains: normalizedQuery, mode: "insensitive" } },
          { middleName: { contains: normalizedQuery, mode: "insensitive" } },
          { lastName: { contains: normalizedQuery, mode: "insensitive" } },
        ]
      },
      take: 10
    });

    return { success: true, data: residents };
  } catch (error) {
    console.error("Search residents error:", error);
    return { success: false, error: "Failed to search residents" };
  }
}

// ─── Get Transaction Types ───────────────────────────────────────────────────
export async function getTransactionTypes() {
  try {
    const types = await prisma.transactionType.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, data: types };
  } catch (error) {
    console.error("Get transaction types error:", error);
    return { success: false, data: [] };
  }
}

// ─── Ensure Civil Registry Transaction Types Exist ───────────────────────────
export async function ensureCivilRegistryTransactionTypes() {
  const types = [
    { code: "LCR_DEATH", name: "Death Certificate Request (True Copy)", category: "Civil Registry", baseFee: 100 },
  ];

  for (const t of types) {
    await prisma.transactionType.upsert({
      where: { code: t.code },
      create: { ...t },
      update: { name: t.name, category: t.category }
    });
  }
}
