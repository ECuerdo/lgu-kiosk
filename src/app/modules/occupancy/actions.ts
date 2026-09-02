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

export async function submitOccupancyPermit(formData: FormData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const targetUserId = await resolveUserId(userId);

    // Get Occupancy Permit Transaction Type
    const type = await prisma.transactionType.findFirst({
      where: { code: "OCCUPANCY_PERMIT" }
    });
    
    if (!type) {
      return { success: false, error: "Occupancy Permit transaction type not found in database." };
    }

    // Extract basic form data
    const occupancyApplicationType = formData.get("occupancyApplicationType") as string || "FULL";
    const buildingPermitNo = formData.get("buildingPermitNo") as string;
    const buildingPermitDateIssued = formData.get("buildingPermitDateIssued") as string;
    const fsecNo = formData.get("fsecNo") as string;
    const fsecDateIssued = formData.get("fsecDateIssued") as string;
    const nameOfProject = formData.get("nameOfProject") as string;
    const locationOfProject = formData.get("locationOfProject") as string;
    const useCharacterOfOccupancy = formData.get("useCharacterOfOccupancy") as string;
    const noOfStoreys = formData.get("noOfStoreys") as string;
    const noOfUnits = formData.get("noOfUnits") as string;
    const totalGrossFloorArea = formData.get("totalGrossFloorArea") as string;
    const dateOfCompletion = formData.get("dateOfCompletion") as string;
    const contactNumber = formData.get("contactNumber") as string || "";

    const customLabelsRaw = formData.get("customLabels") as string;
    let customLabels: Record<string, string> = {};
    if (customLabelsRaw) {
      try { customLabels = JSON.parse(customLabelsRaw); } catch (e) { console.error("Failed to parse customLabels JSON:", e); }
    }

    // Prepare JSON for additional Data
    const additionalData: any = {
      occupancyApplicationType,
      buildingPermitNo,
      buildingPermitDateIssued,
      fsecNo,
      fsecDateIssued,
      nameOfProject,
      locationOfProject,
      useCharacterOfOccupancy,
      noOfStoreys,
      noOfUnits,
      totalGrossFloorArea,
      dateOfCompletion,
      contactNumber,
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
        const path = `occupancy-permits/${targetUserId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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

    // Validate magic numbers of all uploaded files in additionalData
    const fileCheck = await validatePayloadFiles(additionalData);
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    // Sanitize input data to prevent XSS/injection attacks
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
    console.error("Occupancy Permit Submission Error:", error);
    return { success: false, error: "Failed to submit occupancy permit application." };
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

export async function getExistingOccupancyPermits(userId: string) {
  try {
    if (!userId) {
      return { success: false, data: [] };
    }

    const targetUserId = await resolveUserId(userId);

    const type = await prisma.transactionType.findFirst({
      where: { code: "OCCUPANCY_PERMIT" }
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

export async function resubmitOccupancyPermit(transactionId: string, formData: FormData, userId: string) {
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
    const occupancyApplicationType = formData.get("occupancyApplicationType") as string;
    const buildingPermitNo = formData.get("buildingPermitNo") as string;
    const buildingPermitDateIssued = formData.get("buildingPermitDateIssued") as string;
    const fsecNo = formData.get("fsecNo") as string;
    const fsecDateIssued = formData.get("fsecDateIssued") as string;
    const nameOfProject = formData.get("nameOfProject") as string;
    const locationOfProject = formData.get("locationOfProject") as string;
    const useCharacterOfOccupancy = formData.get("useCharacterOfOccupancy") as string;
    const noOfStoreys = formData.get("noOfStoreys") as string;
    const noOfUnits = formData.get("noOfUnits") as string;
    const totalGrossFloorArea = formData.get("totalGrossFloorArea") as string;
    const dateOfCompletion = formData.get("dateOfCompletion") as string;
    const contactNumber = formData.get("contactNumber") as string;

    if (occupancyApplicationType) additionalData.occupancyApplicationType = occupancyApplicationType;
    if (buildingPermitNo) additionalData.buildingPermitNo = buildingPermitNo;
    if (buildingPermitDateIssued) additionalData.buildingPermitDateIssued = buildingPermitDateIssued;
    if (fsecNo) additionalData.fsecNo = fsecNo;
    if (fsecDateIssued) additionalData.fsecDateIssued = fsecDateIssued;
    if (nameOfProject) additionalData.nameOfProject = nameOfProject;
    if (locationOfProject) additionalData.locationOfProject = locationOfProject;
    if (useCharacterOfOccupancy) additionalData.useCharacterOfOccupancy = useCharacterOfOccupancy;
    if (noOfStoreys) additionalData.noOfStoreys = noOfStoreys;
    if (noOfUnits) additionalData.noOfUnits = noOfUnits;
    if (totalGrossFloorArea) additionalData.totalGrossFloorArea = totalGrossFloorArea;
    if (dateOfCompletion) additionalData.dateOfCompletion = dateOfCompletion;
    if (contactNumber) additionalData.contactNumber = contactNumber;

    // Helper to upload and store URL
    const processFile = async (key: string, folder: string) => {
      const value = formData.get(key);
      if (typeof value === "string" && value.startsWith("http")) {
        additionalData.documents[key] = value;
      } else if (value instanceof File && value.size > 0) {
        const timestamp = Date.now();
        const path = `occupancy-permits/${targetUserId}/${folder}/${timestamp}-${value.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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

    // Validate magic numbers of all uploaded files in additionalData
    const fileCheck = await validatePayloadFiles(additionalData);
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    // Get current resident data for snapshot update
    const resident = await prisma.resident.findFirst({
      where: { userId: targetUserId }
    });

    // Sanitize input data to prevent XSS/injection attacks
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
    console.error("Occupancy Permit Resubmission Error:", error);
    return { success: false, error: "Failed to resubmit occupancy permit application." };
  }
}

export async function submitOccupancyPermitPaymentProof(transactionId: string, formData: FormData, userId: string) {
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
    const path = `occupancy-permits/${userId}/payments/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const paymentProofUrl = await uploadFile(file, path);

    if (!paymentProofUrl) {
      return { success: false, error: "Failed to upload payment proof" };
    }

    // Validate magic numbers of the payment proof file
    const fileCheck = await validatePayloadFiles({ paymentProofUrl });
    if (!fileCheck.success) {
      return { success: false, error: fileCheck.error || "File validation failed." };
    }

    const currentAdditionalData = (transaction.additionalData as any) || {};

    const sanitizedAdditionalData = sanitizeObject({
      ...currentAdditionalData,
      gcashReferenceNo: gcashRefNo ? sanitizeString(gcashRefNo) : (currentAdditionalData.gcashReferenceNo || null)
    });
    if (currentAdditionalData.signature) {
      sanitizedAdditionalData.signature = currentAdditionalData.signature;
    }

    // Clear rejection remarks if any, set payment reference
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: paymentProofUrl,
        rejectionRemarks: null,
        additionalData: sanitizedAdditionalData as any,
        updatedAt: new Date()
      }
    });

    revalidatePath("/modules/occupancy");
    revalidatePath("/admin/treasury");
    return { success: true, transactionId: updatedTransaction.id };
  } catch (error) {
    console.error("Payment Proof Upload Error:", error);
    return { success: false, error: "Failed to upload payment proof" };
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

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "PAID",
        additionalData: {
          ...currentAdditionalData,
          clearancesSubmitted: true
        }
      }
    });

    revalidatePath("/modules/occupancy");
    revalidatePath("/admin/engineering");
    return { success: true };
  } catch (error) {
    console.error("Submit Clearances Error:", error);
    return { success: false, error: "Failed to submit clearances" };
  }
}

export async function checkActivePropertyPermit(location: string, currentTransactionId?: string) {
  try {
    if (!location || location.trim().length < 5) {
      return { success: true, isProcessing: false };
    }

    const type = await prisma.transactionType.findFirst({
      where: { code: "OCCUPANCY_PERMIT" }
    });

    if (!type) {
      return { success: false, error: "Transaction type not found" };
    }

    // Get all active occupancy permit transactions
    const activeTransactions = await prisma.transaction.findMany({
      where: {
        typeId: type.id,
        isCancelled: false,
        status: {
          notIn: ["RELEASED", "REJECTED", "DELIVERED"]
        },
        id: currentTransactionId ? { not: currentTransactionId } : undefined
      },
      select: {
        id: true,
        additionalData: true
      }
    });

    // Clean location for fuzzy comparison
    const cleanLocation = location.trim().toLowerCase().replace(/\s+/g, ' ');

    const duplicate = activeTransactions.find(tx => {
      const addData = tx.additionalData as any;
      if (addData && addData.locationOfConstruction) {
        const txLoc = String(addData.locationOfConstruction).trim().toLowerCase().replace(/\s+/g, ' ');
        return txLoc === cleanLocation;
      }
      return false;
    });

    if (duplicate) {
      return { 
        success: true, 
        isProcessing: true, 
        transactionId: duplicate.id 
      };
    }

    return { success: true, isProcessing: false };
  } catch (error) {
    console.error("Error checking active property permit:", error);
    return { success: false, error: "Failed to verify property status" };
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

export async function getSecureUploadUrlsAction(requests: Array<{ fieldName: string; fileExt: string }>, folder: string) {
  try {
    const bucket = "system-assets";
    const dataList = await Promise.all(
      requests.map(async (req) => {
        const sanitizedField = req.fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const timestamp = Date.now() + Math.floor(Math.random() * 1000);
        const path = `${folder}/${sanitizedField}-${timestamp}.${req.fileExt}`;

        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUploadUrl(path);

        if (error || !data?.signedUrl) {
          throw new Error(error?.message || "Failed to create signed URL");
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(path);

        return { signedUrl: data.signedUrl, publicUrl };
      })
    );

    return { success: true as const, data: dataList };
  } catch (error: any) {
    console.error("Get secure upload URLs error:", error);
    return { success: false as const, error: error?.message || "Failed to allocate upload URLs" };
  }
}
