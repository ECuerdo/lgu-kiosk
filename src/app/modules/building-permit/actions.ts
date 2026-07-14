"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

function sanitizeString(value: unknown) {
  if (typeof value !== "string") return value;
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as T;
  }
  if (input && typeof input === "object") {
    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      output[key] = sanitizeObject(value);
    }
    return output as T;
  }
  return sanitizeString(input) as T;
}

async function validatePayloadFiles(payload: Record<string, any>) {
  const suspicious = Object.entries(payload).some(([, value]) => {
    if (typeof value !== "string") return false;
    if (!value.startsWith("http")) return false;
    return !/^https?:\/\/.+/i.test(value);
  });

  if (suspicious) {
    return { success: false, error: "Invalid file payload detected." };
  }

  return { success: true };
}

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

async function resolveUserId(userId: string): Promise<string> {
  if (!userId) return userId;

  const residentForUser = await prisma.resident.findUnique({
    where: { id: userId },
    include: { user: true }
  });

  if (residentForUser) {
    if (residentForUser.userId) {
      return residentForUser.userId;
    }

    const fullNameTemp = [residentForUser.firstName, residentForUser.middleName, residentForUser.lastName]
      .filter(Boolean)
      .join(" ");

    const newUser = await prisma.user.create({
      data: {
        name: fullNameTemp,
        email: residentForUser.email || null,
        rfid: residentForUser.rfid || null,
        role: "USER"
      }
    });

    await prisma.resident.update({
      where: { id: residentForUser.id },
      data: { userId: newUser.id }
    });

    return newUser.id;
  }

  return userId;
}

export async function submitBuildingPermit(formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const targetUserId = await resolveUserId(userId);

    // Get Building Permit Transaction Type
    const type = await prisma.transactionType.findFirst({
      where: { code: "BUILDING_PERMIT" }
    });
    
    if (!type) {
      return { success: false, error: "Building Permit transaction type not found in database." };
    }

    // Check if there is already an active transaction for this user (Commented out to allow multiple applications)
    /*
    const activeTransaction = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        typeId: type.id,
        isCancelled: false,
        status: {
          notIn: ["RELEASED", "REJECTED", "DELIVERED"]
        }
      }
    });

    if (activeTransaction) {
      return { success: false, error: "You already have an active building permit application in progress." };
    }
    */

    // Extract basic form data
    const descriptionOfWork = formData.get("descriptionOfWork") as string;
    const occupancyUse = formData.get("occupancyUse") as string;
    const estimatedCost = formData.get("estimatedCost") as string;
    const locationOfConstruction = formData.get("locationOfConstruction") as string;
    const isLotOwner = formData.get("isLotOwner") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const street = formData.get("street") as string;
    const barangay = formData.get("barangay") as string;
    const totalFloorsValue = formData.get("totalFloors") as string;
    const totalFloors = totalFloorsValue ? parseInt(totalFloorsValue, 10) : null;
    const privacyConsentAccepted = formData.get("privacyConsentAccepted") === "true";

    const customLabelsStr = formData.get("customLabels") as string;
    let customLabels = {};
    if (customLabelsStr) {
      try {
        customLabels = JSON.parse(customLabelsStr);
      } catch (e) {
        console.error("Error parsing customLabels", e);
      }
    }

    if (!privacyConsentAccepted) {
      return { success: false, error: "Privacy consent is required." };
    }

    // Prepare JSON for additional Data
    const additionalData: any = {
      descriptionOfWork,
      occupancyUse,
      estimatedCost,
      locationOfConstruction,
      isLotOwner,
      houseNumber,
      street,
      barangay,
      totalFloors,
      privacyConsentAccepted,
      privacyConsentAcceptedAt: privacyConsentAccepted ? new Date().toISOString() : null,
      documents: {},
      customLabels
    };

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `building-permits/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    // Upload ID and TCT if they exist
    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");
    await processFile("tctFile", "tct");

    // Loop through requirements and permits
    for (const [key] of Array.from(formData.entries())) {
      if (key.startsWith("req_") || key.startsWith("permit_")) {
         await processFile(key, key.startsWith("req_") ? "requirements" : "permits");
      }
    }

    // Get current resident data for snapshot
    const resident = await prisma.resident.findFirst({
      where: { userId: targetUserId }
    });

    const fileCheck = await validatePayloadFiles(additionalData);
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    const sanitizedAdditionalData = sanitizeObject(additionalData);
    if (additionalData.signature) {
      sanitizedAdditionalData.signature = additionalData.signature;
    }

    const sanitizedResidentSnapshot = resident ? sanitizeObject(resident) : {};

    // Create the transaction (FOR_REQUESTING)
    const transaction = await prisma.transaction.create({
      data: {
        userId: targetUserId,
        typeId: type.id,
        status: "FOR_REQUESTING",
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
        totalAmount: 0,
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };

  } catch (error) {
    console.error("Building Permit Submission Error:", error);
    return { success: false, error: "Failed to submit building permit application." };
  }
}

export async function saveTransactionSignature(transactionId: string, signatureUrl: string, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const targetUserId = await resolveUserId(userId);

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== targetUserId) {
      return { success: false, error: "Transaction not found or unauthorized" };
    }

    const additionalData = transaction.additionalData as any || {};
    additionalData.signature = signatureUrl;

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

export async function getExistingBuildingPermits(userId: string) {
  try {
    if (!userId) {
      return { success: false, data: [] };
    }

    const targetUserId = await resolveUserId(userId);

    const type = await prisma.transactionType.findFirst({
      where: { code: "BUILDING_PERMIT" }
    });

    if (!type) {
      return { success: false, data: [] };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: targetUserId,
        typeId: type.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching existing permits:", error);
    return { success: false, data: [] };
  }
}

export async function resubmitBuildingPermit(transactionId: string, formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const targetUserId = await resolveUserId(userId);

    // Fetch the existing transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId, userId: targetUserId }
    });

    if (!transaction || transaction.status !== "FOR_REVISION") {
      return { success: false, error: "Invalid transaction for resubmission" };
    }

    const additionalData = transaction.additionalData as any || { documents: {} };
    if (!additionalData.documents) {
      additionalData.documents = {};
    }

    const customLabelsStr = formData.get("customLabels") as string;
    if (customLabelsStr) {
      try {
        additionalData.customLabels = {
          ...(additionalData.customLabels || {}),
          ...JSON.parse(customLabelsStr)
        };
      } catch (e) {
        console.error("Error parsing customLabels in resubmit", e);
      }
    }

    // Extract basic form data
    const descriptionOfWork = formData.get("descriptionOfWork") as string;
    const occupancyUse = formData.get("occupancyUse") as string;
    const estimatedCost = formData.get("estimatedCost") as string;
    const locationOfConstruction = formData.get("locationOfConstruction") as string;
    const isLotOwner = formData.get("isLotOwner") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const street = formData.get("street") as string;
    const barangay = formData.get("barangay") as string;
    const totalFloorsValue = formData.get("totalFloors") as string;
    const totalFloors = totalFloorsValue ? parseInt(totalFloorsValue, 10) : null;
    const privacyConsentAccepted = formData.get("privacyConsentAccepted") === "true";

    if (descriptionOfWork) additionalData.descriptionOfWork = descriptionOfWork;
    if (occupancyUse) additionalData.occupancyUse = occupancyUse;
    if (estimatedCost) additionalData.estimatedCost = estimatedCost;
    if (locationOfConstruction) additionalData.locationOfConstruction = locationOfConstruction;
    if (isLotOwner) additionalData.isLotOwner = isLotOwner;
    if (houseNumber) additionalData.houseNumber = houseNumber;
    if (street) additionalData.street = street;
    if (barangay) additionalData.barangay = barangay;
    if (totalFloors !== null) additionalData.totalFloors = totalFloors;
    if (privacyConsentAccepted) {
      additionalData.privacyConsentAccepted = true;
      additionalData.privacyConsentAcceptedAt = new Date().toISOString();
    }

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `building-permits/${userId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadFile(value, path);
        if (url) {
          additionalData.documents[key] = url;
        }
      }
    };

    // Upload ID and TCT if they exist
    await processFile("newIdFile", "ids");
    await processFile("newIdFileBack", "ids");
    await processFile("tctFile", "tct");

    // Loop through requirements and permits
    for (const [key] of Array.from(formData.entries())) {
      if (key.startsWith("req_") || key.startsWith("permit_")) {
         await processFile(key, key.startsWith("req_") ? "requirements" : "permits");
      }
    }

    // Get current resident data for snapshot update
    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    const fileCheck = await validatePayloadFiles(additionalData);
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    const sanitizedAdditionalData = sanitizeObject(additionalData);
    if (additionalData.signature) {
      sanitizedAdditionalData.signature = additionalData.signature;
    }

    const sanitizedResidentSnapshot = resident ? sanitizeObject(resident) : {};

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "FOR_REQUESTING",
        rejectionRemarks: null,
        residentSnapshot: sanitizedResidentSnapshot as any,
        additionalData: sanitizedAdditionalData as any,
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: updatedTransaction.id };

  } catch (error) {
    console.error("Building Permit Resubmission Error:", error);
    return { success: false, error: "Failed to resubmit building permit application." };
  }
}

export async function submitBuildingPermitPaymentProof(transactionId: string, formData: FormData, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    const file = formData.get("paymentFile") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    const gcashRefNo = formData.get("gcashReferenceNo") as string;

    const timestamp = Date.now();
    const path = `building-permits/${userId}/payments/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const paymentProofUrl = await uploadFile(file, path);

    if (!paymentProofUrl) {
      return { success: false, error: "Failed to process payment" };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};

    // Clear rejection remarks if any, set payment reference
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: paymentProofUrl,
        rejectionRemarks: null,
        additionalData: {
          ...currentAdditionalData,
          gcashReferenceNo: gcashRefNo || currentAdditionalData.gcashReferenceNo || null
        },
        updatedAt: new Date()
      }
    });

    revalidatePath("/user/services/building-permit");
    revalidatePath("/admin/treasury");
    return { success: true, transactionId: updatedTransaction.id };
  } catch (error) {
    console.error("Payment Proof Upload Error:", error);
    return { success: false, error: "Failed to process payment" };
  }
}

export async function saveBuildingPermitCheckoutDetails(
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
    console.error("Save building permit checkout details error:", error);
    return { success: false, error: "Failed to save checkout details" };
  }
}

export async function reconcileBuildingPermitPayment(transactionId: string, userId: string) {
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
    revalidatePath("/modules/building-permit");
    revalidatePath("/admin/treasury");
    return { success: true, paid: true };
  } catch (error) {
    console.error("Reconcile building permit payment error:", error);
    return { success: false, paid: false, error: "Failed to verify payment" };
  }
}

export async function submitClearancesForReviewAction(transactionId: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};
    if (transaction.status !== "PAID") {
      return { success: false, error: "Payment must be verified before submitting clearances." };
    }
    if (!currentAdditionalData.bfpClearanceUrl || !currentAdditionalData.zoningClearanceUrl) {
      return { success: false, error: "Both BFP and Zoning clearances are required." };
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "PAID",
        additionalData: {
          ...currentAdditionalData,
          clearancesSubmitted: true,
          clearancesSubmittedAt: new Date().toISOString()
        }
      }
    });

    revalidatePath("/modules/building-permit");
    revalidatePath("/admin/engineering");
    return { success: true };
  } catch (error) {
    console.error("Submit Clearances Error:", error);
    return { success: false, error: "Failed to submit clearances" };
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
      return { success: false, error: "Cannot cancel transaction at this stage. Please contact support if you need assistance." };
    }

    await prisma.transaction.update({
      where: { id },
      data: { isCancelled: true }
    });

    return { success: true };
  } catch (error) {
    console.error("Cancel transaction error:", error);
    return { success: false, error: "Failed to cancel transaction" };
  }
}

export async function uploadECopyAction(formData: FormData, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const storagePath = `services/ecopies/${filename}`;

    const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);
    if (!publicUrl) return { success: false, error: "Upload failed" };

    return { success: true, data: publicUrl };
  } catch (error) {
    console.error("Upload E-Copy error:", error);
    return { success: false, error: "Failed to upload file" };
  }
}

export async function saveBfpClearanceProofAction(id: string, bfpClearanceUrl: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });
    if (!transaction || transaction.userId !== userId) return { success: false, error: "Transaction not found" };

    const currentAdditionalData = (transaction.additionalData as any) || {};
    const updatedAdditionalData = {
      ...currentAdditionalData,
      bfpClearanceUrl
    };

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        additionalData: updatedAdditionalData
      }
    });

    revalidatePath("/user/services/building-permit");
    return { success: true, data: updatedTransaction };
  } catch (error) {
    console.error("Save BFP Clearance proof error:", error);
    return { success: false, error: "Failed to save BFP Clearance proof" };
  }
}

export async function saveZoningClearanceProofAction(id: string, url: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!transaction || transaction.userId !== userId) return { success: false, error: "Transaction not found" };

    const currentAdditionalData = (transaction.additionalData as any) || {};

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        additionalData: {
          ...currentAdditionalData,
          zoningClearanceUrl: url
        }
      }
    });

    revalidatePath("/user/services/building-permit");
    return { success: true, data: updatedTransaction };
  } catch (error) {
    console.error("Save zoning clearance proof error:", error);
    return { success: false, error: "Failed to save zoning clearance proof" };
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
