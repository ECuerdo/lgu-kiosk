"use server";

import { prisma } from "@/lib/prisma";

export async function getTransactionForCheckout(transactionId: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        type: true
      }
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    if (transaction.userId !== userId) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: transaction };
  } catch (error: any) {
    console.error("Fetch transaction for checkout error:", error);
    return { success: false, error: error.message || "Failed to load transaction details" };
  }
}

export async function saveGlobalCheckoutDetails(
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

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        fulfillmentType: details.fulfillmentType,
        paymentType,
        deliveryAddress: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress : null,
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
  } catch (error: any) {
    console.error("Save global checkout details error:", error);
    return { success: false, error: error.message || "Failed to finalize checkout details" };
  }
}
