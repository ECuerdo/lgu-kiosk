"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function submitBirthCertificateRequest(formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get LCR_BIRTH Transaction Type
    const type = await prisma.transactionType.findFirst({
      where: { code: "LCR_BIRTH" }
    });
    
    if (!type) {
      return { success: false, error: "Birth Certificate transaction type not found in database." };
    }

    // Extract structured form data
    const certFirstName = formData.get("certFirstName") as string;
    const certMiddleName = formData.get("certMiddleName") as string;
    const certLastName = formData.get("certLastName") as string;
    const certSuffix = formData.get("certSuffix") as string;
    const sex = formData.get("sex") as string;
    const dateOfEventStr = formData.get("dateOfEvent") as string;
    const placeOfEvent = formData.get("placeOfEvent") as string;
    const fatherFirstName = formData.get("fatherFirstName") as string;
    const fatherMiddleName = formData.get("fatherMiddleName") as string;
    const fatherLastName = formData.get("fatherLastName") as string;
    const motherFirstName = formData.get("motherFirstName") as string;
    const motherMiddleName = formData.get("motherMiddleName") as string;
    const motherLastName = formData.get("motherLastName") as string;
    const registryNumber = formData.get("registryNumber") as string;
    const purpose = formData.get("purpose") as string;
    const relation = formData.get("relation") as string;
    const contactNumber = formData.get("contactNumber") as string;
    const email = formData.get("email") as string;
    const occupation = formData.get("occupation") as string;
    const privacyConsentAccepted = formData.get("privacyConsentAccepted") === "true";

    // Validate required fields
    if (!certFirstName || !certLastName || !dateOfEventStr || !placeOfEvent || !sex) {
      return { success: false, error: "Please fill in all required fields." };
    }

    const dateOfEvent = new Date(dateOfEventStr);
    
    // Construct names
    const subjectName = `${certFirstName} ${certMiddleName ? certMiddleName + ' ' : ''}${certLastName}${certSuffix ? ' ' + certSuffix : ''}`.trim();
    const fatherName = `${fatherFirstName} ${fatherMiddleName ? fatherMiddleName + ' ' : ''}${fatherLastName}`.trim() || "N/A";
    const motherName = `${motherFirstName} ${motherMiddleName ? motherMiddleName + ' ' : ''}${motherLastName}`.trim() || "N/A";

    // Prepare JSON for additional Data
    const additionalData: any = {
      certFirstName,
      certMiddleName,
      certLastName,
      certSuffix,
      subjectName,
      gender: sex,
      dateOfEvent: dateOfEventStr,
      placeOfEvent,
      fatherFirstName,
      fatherMiddleName,
      fatherLastName,
      fatherName,
      motherFirstName,
      motherMiddleName,
      motherLastName,
      motherName,
      registryNumber,
      purpose,
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
        const path = `birth-certificates/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    // Upload ID files if they exist
    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");

    // Get current resident data for snapshot
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    // Create the transaction and associated BirthCertificateRequest in a transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        typeId: type.id,
        status: "FOR_INSPECTION",
        residentSnapshot: resident ? (resident as any) : {},
        additionalData: additionalData,
        totalAmount: type.baseFee,
        birthCertificateRequest: {
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

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };

  } catch (error) {
    console.error("Birth Certificate Request Submission Error:", error);
    return { success: false, error: "Failed to submit Birth Certificate request." };
  }
}

export async function saveTransactionSignature(transactionId: string, signatureBase64: string, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found or unauthorized" };
    }

    const additionalData = transaction.additionalData as any || {};
    additionalData.signature = signatureBase64;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { additionalData }
    });

    revalidatePath("/user/transactions");
    return { success: true };

  } catch (error) {
    console.error("Save signature error:", error);
    return { success: false, error: "Failed to save signature." };
  }
}

export async function getExistingBirthRequests(userId: string) {
  try {
    if (!userId) {
      return { success: false, data: [] };
    }

    const type = await prisma.transactionType.findFirst({
      where: { code: "LCR_BIRTH" }
    });

    if (!type) {
      return { success: false, data: [] };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        typeId: type.id
      },
      include: {
        birthCertificateRequest: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching existing birth requests:", error);
    return { success: false, data: [] };
  }
}

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

    revalidatePath("/user/services/requests");
    revalidatePath(`/user/services/requests/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Cancel transaction error:", error);
    return { success: false, error: "Failed to cancel transaction" };
  }
}

export async function saveBirthCertificateCheckoutDetails(
  transactionId: string,
  userId: string,
  details: {
    fulfillmentType: "PICK_UP" | "DELIVERY";
    paymentMethod: "gcash" | "qrph" | "dob";
    deliveryAddress: {
      barangay: string;
      houseNumber: string;
      street: string;
      sitio: string;
      purok: string;
      municipality: string;
      province: string;
      landmark: string;
    };
    deliveryFee: number;
    totalAmount: number;
  },
) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.userId !== userId) return { success: false, error: "Transaction not found" };

    const additionalData = (transaction.additionalData as any) || {};
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        fulfillmentType: details.fulfillmentType,
        paymentType: details.paymentMethod === "dob" ? "BANK_TRANSFER" : "E_PAYMENT",
        deliveryAddress: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress : undefined,
        deliveryLandmark: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress.landmark : null,
        totalAmount: details.totalAmount,
        fiscalSnapshot: {
          ...((transaction.fiscalSnapshot as any) || {}),
          baseAmount: Math.max(0, details.totalAmount - details.deliveryFee),
          deliveryFee: details.deliveryFee,
          totalAmount: details.totalAmount,
        },
        additionalData: {
          ...additionalData,
          paymentMethod: details.paymentMethod,
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Save checkout details error:", error);
    return { success: false, error: "Failed to save checkout details" };
  }
}

export async function reconcileBirthCertificatePayment(transactionId: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.userId !== userId) return { success: false, error: "Transaction not found" };
    if (transaction.status === "PAID") return { success: true, paid: true };

    const additionalData = (transaction.additionalData as any) || {};
    const checkoutSessionId = additionalData?.paymongo?.checkoutSessionId;
    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!checkoutSessionId || !secret) return { success: false, paid: false, error: "Checkout session unavailable" };

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) return { success: false, paid: false, error: "Unable to verify payment" };

    const attributes = payload?.data?.attributes || {};
    const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
    const paidPayment = payments.find((payment: any) => {
      const status = String(payment?.attributes?.status || payment?.status || "").toLowerCase();
      return status === "paid" || status === "succeeded";
    });
    const sessionStatus = String(attributes.payment_status || attributes.status || "").toLowerCase();
    const isPaid = Boolean(paidPayment) || sessionStatus === "paid" || sessionStatus === "succeeded";
    if (!isPaid) return { success: true, paid: false };

    const paymentId = paidPayment?.id || checkoutSessionId;
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "PAID",
        paymentReference: paymentId,
        additionalData: {
          ...additionalData,
          paymongo: {
            ...additionalData.paymongo,
            paymentId,
            verifiedAt: new Date().toISOString(),
          },
        },
      },
    });
    revalidatePath("/modules/civil-registry/birth-certificate-request");
    return { success: true, paid: true };
  } catch (error) {
    console.error("Reconcile payment error:", error);
    return { success: false, paid: false, error: "Failed to verify payment" };
  }
}

export async function getBarangayNames() {
  try {
    const barangays = await prisma.barangayInfo.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: barangays.map((b) => b.name) };
  } catch (error) {
    console.error("Get barangay names error:", error);
    return { success: false, data: [] as string[] };
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
