import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isValidSignature(header: string | null, secret: string, rawBody: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map(part => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signatures = [parts.te, parts.li].filter(Boolean);
  if (!timestamp || signatures.length === 0) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some(signature => {
    const actual = Buffer.from(signature, "utf8");
    const target = Buffer.from(expected, "utf8");
    return actual.length === target.length && crypto.timingSafeEqual(actual, target);
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!secret || !isValidSignature(request.headers.get("paymongo-signature"), secret, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = String(event?.data?.attributes?.type || "").replace(/_/g, ".").toLowerCase();
    if (!eventType.includes("paid")) return NextResponse.json({ received: true });

    const resource = event?.data?.attributes?.data;
    const attributes = resource?.attributes || {};
    const checkoutSessionId =
      String(resource?.id || "").startsWith("cs_") ? resource.id :
        attributes.checkout_session_id || attributes.checkoutSessionId;
    const transactionId = attributes?.metadata?.transactionId;

    const transaction = transactionId
      ? await prisma.transaction.findUnique({ where: { id: transactionId } })
      : checkoutSessionId
        ? await prisma.transaction.findFirst({
          where: { additionalData: { path: ["paymongo", "checkoutSessionId"], equals: checkoutSessionId } },
        })
        : null;

    if (!transaction) return NextResponse.json({ received: true });
    const additionalData = (transaction.additionalData as Record<string, unknown>) || {};
    const existingPaymongo =
      typeof additionalData.paymongo === "object" && additionalData.paymongo !== null
        ? additionalData.paymongo as Record<string, unknown>
        : {};
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "PAID",
        paymentReference: resource?.id || checkoutSessionId,
        additionalData: {
          ...additionalData,
          paymongo: {
            ...existingPaymongo,
            paymentId: resource?.id || null,
            verifiedAt: new Date().toISOString(),
          },
        },
      },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayMongo webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
