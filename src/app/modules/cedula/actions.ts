"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { calculateCedula } from "@/lib/cedula";

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

export async function getExistingCedulaTransactions(userId: string) {
  try {
    if (!userId) {
      return { success: false, data: [] };
    }

    const individualType = await prisma.transactionType.findFirst({
      where: { code: "CEDULA_IND" }
    });
    const juridicalType = await prisma.transactionType.findFirst({
      where: { code: "CEDULA_JUR" }
    });

    const typeIds = [individualType?.id, juridicalType?.id].filter(Boolean) as string[];

    if (typeIds.length === 0) {
      return { success: false, data: [] };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        typeId: { in: typeIds }
      },
      include: {
        type: true,
        cedula: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching existing Cedulas:", error);
    return { success: false, data: [] };
  }
}

async function processFileUpload(file: File, userId: string, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  try {
    const timestamp = Date.now();
    const path = `cedulas/${userId}/${folder}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const url = await uploadFile(file, path);
    return url;
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}

export async function submitCedulaTransaction(formData: FormData, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const typeId = formData.get("typeId") as string;
    const applicantType = formData.get("applicantType") as "INDIVIDUAL" | "JURIDICAL";
    const incomeSource = formData.get("incomeSource") as string;
    const incomeVal = formData.get("income") as string;
    const propertyValueVal = formData.get("propertyValue") as string;
    const businessName = formData.get("businessName") as string;
    
    const residentSnapshotRaw = formData.get("residentSnapshot") as string;
    const residentSnapshot = residentSnapshotRaw ? JSON.parse(residentSnapshotRaw) : {};

    const transactionType = await prisma.transactionType.findUnique({
      where: { id: typeId }
    });
    if (!transactionType) return { success: false, error: "Transaction type not found" };

    // File inputs (optional from phone upload handoff, or uploaded directly)
    const idFile = formData.get("idFile") as File;
    const proofFile = formData.get("proofFile") as File;
    const existingIdUrl = formData.get("existingIdUrl") as string;
    const existingProofUrl = formData.get("existingProofUrl") as string;

    let idUrl = await processFileUpload(idFile, userId, "ids");
    if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

    let proofUrl = await processFileUpload(proofFile, userId, "proofs");
    if (!proofUrl && existingProofUrl) proofUrl = existingProofUrl;

    const income = parseFloat(incomeVal) || 0;
    const propertyValue = parseFloat(propertyValueVal) || 0;
    const baseFee = transactionType.baseFee ? Number(transactionType.baseFee) : 5.00;

    const calculation = calculateCedula({
      type: applicantType,
      income,
      propertyValue,
      baseFee
    });

    const additionalData = {
      applicantType,
      incomeSource,
      income,
      propertyValue,
      businessName: businessName || null,
      validIdUrl: idUrl || null,
      proofOfIncomeUrl: proofUrl || null,
      isStudent: false
    };

    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        typeId,
        status: "FOR_REQUESTING",
        residentSnapshot: resident ? (resident as any) : residentSnapshot,
        additionalData,
        totalAmount: calculation.totalAmount,
        fiscalSnapshot: {
          basicTax: calculation.basicTax,
          additionalTax: calculation.additionalTax,
          penaltyCharge: calculation.penalty,
          deliveryFee: calculation.deliveryFee,
          totalAmount: calculation.totalAmount
        },
        businessName: businessName || null,
        isStudent: false
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };
  } catch (error: any) {
    console.error("Submit Cedula Error:", error);
    return { success: false, error: error.message || "Failed to submit request" };
  }
}

export async function submitStudentCedulaTransaction(formData: FormData, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const typeId = formData.get("typeId") as string;
    const purpose = formData.get("purpose") as string;
    const residentSnapshotRaw = formData.get("residentSnapshot") as string;
    const residentSnapshot = residentSnapshotRaw ? JSON.parse(residentSnapshotRaw) : {};

    const transactionType = await prisma.transactionType.findUnique({
      where: { id: typeId }
    });
    if (!transactionType) return { success: false, error: "Transaction type not found" };

    // File uploads
    const idFile = formData.get("idFile") as File;
    const proofFile = formData.get("proofFile") as File;
    const existingIdUrl = formData.get("existingIdUrl") as string;
    const existingProofUrl = formData.get("existingProofUrl") as string;

    let idUrl = await processFileUpload(idFile, userId, "ids");
    if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

    let proofUrl = await processFileUpload(proofFile, userId, "proofs");
    if (!proofUrl && existingProofUrl) proofUrl = existingProofUrl;

    const baseFee = transactionType.baseFee ? Number(transactionType.baseFee) : 5.00;
    const calculation = calculateCedula({
      type: "INDIVIDUAL",
      income: 0,
      propertyValue: 0,
      baseFee
    });

    const additionalData = {
      applicantType: "INDIVIDUAL",
      isStudent: true,
      purpose,
      validIdUrl: idUrl || null,
      proofOfIncomeUrl: proofUrl || null
    };

    const resident = await prisma.resident.findFirst({
      where: { userId: userId }
    });

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        typeId,
        status: "FOR_REQUESTING",
        residentSnapshot: resident ? (resident as any) : residentSnapshot,
        additionalData,
        totalAmount: calculation.totalAmount,
        fiscalSnapshot: {
          basicTax: calculation.basicTax,
          additionalTax: calculation.additionalTax,
          penaltyCharge: calculation.penalty,
          deliveryFee: calculation.deliveryFee,
          totalAmount: calculation.totalAmount
        },
        businessName: null,
        isStudent: true
      }
    });

    revalidatePath("/user/transactions");
    return { success: true, transactionId: transaction.id };
  } catch (error: any) {
    console.error("Submit Student Cedula Error:", error);
    return { success: false, error: error.message || "Failed to submit student request" };
  }
}

export async function saveCedulaCheckoutDetails(
  transactionId: string,
  userId: string,
  details: {
    fulfillmentType: "PICK_UP" | "DELIVERY";
    paymentMethod: "gcash" | "qrph" | "dob";
    deliveryAddress?: {
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
  }
) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.userId !== userId) return { success: false, error: "Transaction not found" };

    const additionalData = (transaction.additionalData as any) || {};
    
    const paymentType = details.paymentMethod === "dob" ? "BANK_TRANSFER" : "E_PAYMENT";
    const nextStatus = "UNPAID";

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        fulfillmentType: details.fulfillmentType,
        paymentType,
        status: nextStatus,
        deliveryAddress: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress : undefined,
        deliveryLandmark: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress?.landmark : null,
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
    console.error("Save Cedula Checkout Details Error:", error);
    return { success: false, error: "Failed to save checkout details" };
  }
}

export async function reconcileCedulaPayment(transactionId: string, userId: string) {
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

    revalidatePath("/modules/cedula");
    return { success: true, paid: true };
  } catch (error) {
    console.error("Reconcile Cedula Payment Error:", error);
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

export async function getTransactionTypes() {
  try {
    const types = await prisma.transactionType.findMany({
      where: { isActive: true, code: { startsWith: "CEDULA" } },
      orderBy: { name: "asc" }
    });
    return { success: true, data: types };
  } catch (error) {
    console.error("Fetch transaction types error:", error);
    return { success: false, error: "Failed to fetch services" };
  }
}

export async function cancelTransaction(id: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) return { success: false, error: "Unauthorized" };
    if (tx.isCancelled) return { success: false, error: "Already cancelled" };

    const nonCancellable = ["FOR_PROCESSING", "PAID", "RELEASED", "DELIVERED"];
    if (nonCancellable.includes(tx.status)) {
      return { success: false, error: "Cannot cancel transaction at this stage." };
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

export async function getCedulaTransactionById(id: string, userId: string) {
  try {
    if (!userId || !id) return { success: false, error: "Unauthorized or Invalid Request" };

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        type: true,
        cedula: true,
      }
    });

    if (!transaction) return { success: false, error: "Transaction not found" };

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Fetch transaction details error:", error);
    return { success: false, error: "Failed to fetch transaction details" };
  }
}

export async function getCedulaSettings() {
  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "cedula_basic_tax_individual",
            "cedula_basic_tax_juridical",
            "cedula_additional_tax_rate_individual",
            "cedula_additional_tax_rate_juridical",
            "cedula_cap_individual",
            "cedula_cap_juridical",
            "cedula_penalty_rate_monthly"
          ]
        }
      }
    });

    const settingsMap: Record<string, string> = {};
    settingsList.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return { success: true, data: settingsMap };
  } catch (err: any) {
    console.error("Error loading Cedula settings:", err);
    return { success: false, error: err.message || "Failed to load settings" };
  }
}

