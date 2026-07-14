"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetch all transactions for a given resident user ID in the kiosk
 */
export async function getUserTransactions(userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transactions = await prisma.transaction.findMany({
      where: { userId: userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        isCancelled: true,
        totalAmount: true,
        type: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true
          }
        },
        cedula: {
          select: {
            id: true
          }
        },
        businessPermit: {
          select: {
            id: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Fetch user transactions error:", error);
    return { success: false, error: "Failed to fetch your requests" };
  }
}

/**
 * Fetch a single transaction by ID for the kiosk
 */
export async function getTransactionById(id: string, userId?: string) {
  try {
    if (!id) return { success: false, error: "Invalid transaction ID" };

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        type: true,
        cedula: true,
        businessPermit: true,
        birthCertificateRequest: true,
        birthCertificateRegistry: true,
        deathRegistration: true,
        deathCertificateRequest: true,
        marriageRegistration: true,
        marriageLicenseApplication: true,
        marriageCertificateRequest: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            residentProfile: true
          }
        }
      }
    });

    if (!transaction) return { success: false, error: "Transaction not found" };

    // Optionally check ownership if userId is supplied
    if (userId && transaction.userId !== userId) {
      return { success: false, error: "Forbidden" };
    }

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Fetch transaction details error:", error);
    return { success: false, error: "Failed to fetch transaction details" };
  }
}

/**
 * Cancel a transaction from the kiosk
 */
export async function cancelTransaction(id: string, userId: string) {
  try {
    if (!id || !userId) return { success: false, error: "Missing parameters" };

    const tx = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!tx) return { success: false, error: "Transaction not found" };
    if (tx.userId !== userId) return { success: false, error: "Forbidden" };
    if (tx.isCancelled) return { success: false, error: "This request is already cancelled." };

    // Only allow cancellation if the request is still in DRAFT or FOR_REQUESTING phase
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

    revalidatePath("/dashboard/appointment");
    revalidatePath(`/dashboard/appointment/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Cancel transaction error:", error);
    return { success: false, error: "An error occurred while cancelling your appointment." };
  }
}

/**
 * Helper to fetch system settings in kiosk for branding
 */
export async function getSystemSettingAction(key: string, defaultValue: string = "") {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });
    return { success: true, data: setting?.value || defaultValue };
  } catch (error) {
    console.error(`Error getting system setting ${key}:`, error);
    return { success: true, data: defaultValue };
  }
}
