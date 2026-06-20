"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export interface DeliveryAddress {
  barangay: string;
  houseNumber: string;
  street: string;
  sitio: string;
  purok: string;
  municipality: string;
  province: string;
  landmark: string;
}

export interface CheckoutDetails {
  fulfillmentType: "PICK_UP" | "DELIVERY" | "E_COPY";
  paymentMethod: "gcash" | "qrph";
  deliveryAddress: DeliveryAddress;
  deliveryFee: number;
  totalAmount: number;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}

export async function getTransactionForCheckout(id: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        type: true,
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    // Load Resident profile location
    const resident = await prisma.resident.findFirst({
      where: { userId },
      select: { latitude: true, longitude: true },
    });

    return {
      success: true,
      data: {
        ...transaction,
        residentLat: resident?.latitude || null,
        residentLng: resident?.longitude || null,
      }
    };
  } catch (error) {
    console.error("Get transaction error:", error);
    return { success: false, error: "Failed to fetch transaction details" };
  }
}

export async function saveCheckoutDetails(
  transactionId: string,
  userId: string,
  details: CheckoutDetails
) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    const additionalData = (transaction.additionalData as Record<string, unknown>) || {};
    const paymentType = "E_PAYMENT";
    const nextStatus = "UNPAID";

    // Set delivery address properly, cast to unknown first then to Json type to satisfy linter
    const deliveryAddressVal = details.fulfillmentType === "DELIVERY"
      ? (details.deliveryAddress as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        fulfillmentType: details.fulfillmentType,
        paymentType,
        status: nextStatus,
        deliveryAddress: deliveryAddressVal,
        deliveryLat: details.fulfillmentType === "DELIVERY" ? details.deliveryLat : null,
        deliveryLng: details.fulfillmentType === "DELIVERY" ? details.deliveryLng : null,
        deliveryLandmark: details.fulfillmentType === "DELIVERY" ? details.deliveryAddress?.landmark : null,
        totalAmount: details.totalAmount,
        fiscalSnapshot: {
          ...((transaction.fiscalSnapshot as Record<string, unknown>) || {}),
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

export async function reconcilePayment(transactionId: string, userId: string) {
  try {
    if (!userId) return { success: false, error: "Unauthorized" };

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { type: true },
    });

    if (!transaction || transaction.userId !== userId) {
      return { success: false, error: "Transaction not found" };
    }

    if (transaction.status === "PAID") {
      return { success: true, paid: true };
    }

    const additionalData = (transaction.additionalData as Record<string, unknown>) || {};
    const paymongoData = (additionalData.paymongo as Record<string, unknown>) || {};
    const checkoutSessionId = paymongoData.checkoutSessionId as string | undefined;
    const secret = process.env.PAYMONGO_SECRET_KEY;

    if (!checkoutSessionId || !secret) {
      return { success: false, paid: false, error: "Checkout session unavailable" };
    }

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      },
      cache: "no-store",
    });

    const payload = await response.json();
    if (!response.ok) {
      return { success: false, paid: false, error: "Unable to verify payment" };
    }

    const attributes = (payload?.data?.attributes as Record<string, unknown>) || {};
    const payments = Array.isArray(attributes.payments) ? attributes.payments : [];
    const paidPayment = payments.find((payment: unknown) => {
      const p = payment as Record<string, unknown>;
      const attrs = (p?.attributes as Record<string, unknown>) || {};
      const status = String(attrs.status || p.status || "").toLowerCase();
      return status === "paid" || status === "succeeded";
    });

    const sessionStatus = String(attributes.payment_status || attributes.status || "").toLowerCase();
    const isPaid = Boolean(paidPayment) || sessionStatus === "paid" || sessionStatus === "succeeded";

    if (!isPaid) {
      return { success: true, paid: false };
    }

    const paidPaymentObj = paidPayment as Record<string, unknown>;
    const paymentId = (paidPaymentObj?.id as string) || checkoutSessionId;
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "PAID",
        paymentReference: paymentId,
        additionalData: {
          ...additionalData,
          paymongo: {
            ...paymongoData,
            paymentId,
            verifiedAt: new Date().toISOString(),
          },
        },
      },
    });

    if (transaction.type.code.startsWith("CEDULA")) {
      revalidatePath("/modules/cedula");
      revalidatePath(`/modules/cedula/${transactionId}`);
    } else if (transaction.type.code.startsWith("BUILDING")) {
      revalidatePath("/modules/building-permit");
    } else if (transaction.type.code.startsWith("BUSINESS")) {
      revalidatePath("/modules/business-permit");
    }

    return { success: true, paid: true };
  } catch (error) {
    console.error("Reconcile payment error:", error);
    return { success: false, paid: false, error: "Failed to verify payment" };
  }
}

export async function getBarangayNames() {
  try {
    const barangays = await prisma.barangayInfo.findMany({
      select: { name: true, deliveryFee: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: barangays };
  } catch (error) {
    console.error("Get barangay names error:", error);
    return { success: false, data: [] as { name: string; deliveryFee: number }[] };
  }
}
