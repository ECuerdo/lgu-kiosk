import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { amount, type = "gcash", reference, transactionId } = await request.json();
    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "PAYMONGO_SECRET_KEY not configured" }, { status: 500 });

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const redirectUrl = `${origin}/modules/building-permit`;
    const paymentMethodTypes =
      type === "qrph" ? ["qrph"] :
      type === "dob" ? ["dob", "dob_ubp"] :
      ["gcash"];

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing_information_required: true,
            payment_method_types: paymentMethodTypes,
            line_items: [{ amount: amountCents, currency: "PHP", name: reference || "Municipal Transaction Payment", quantity: 1 }],
            success_url: `${redirectUrl}?payment=success&transactionId=${encodeURIComponent(transactionId || "")}`,
            cancel_url: `${redirectUrl}?payment=cancelled&transactionId=${encodeURIComponent(transactionId || "")}`,
            metadata: { transactionId, paymentMethod: type },
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.errors || "Failed to initialize payment" }, { status: response.status });

    if (data?.data?.id && transactionId) {
      const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (transaction) {
        const additionalData = (transaction.additionalData as Record<string, unknown>) || {};
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            additionalData: {
              ...additionalData,
              paymongo: { checkoutSessionId: data.data.id, paymentMethod: type },
            },
          },
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PayMongo checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
