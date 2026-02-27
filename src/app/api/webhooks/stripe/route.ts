import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/payments-agent/store";

/**
 * Verifies webhook authenticity using shared Stripe webhook secret.
 * Step 1: Recompute HMAC over raw payload.
 * Step 2: Compare with provided signature in constant time.
 * Step 3: Return authenticity decision.
 */
function verifyStripeSignature(
  payload: string,
  signature: string | null,
): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

/**
 * Stripe webhook ingress endpoint.
 * Step 1: Read raw payload + signature header.
 * Step 2: Reject if signature verification fails.
 * Step 3: Enqueue webhook job for downstream processing.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("x-stripe-signature");

  if (!verifyStripeSignature(payload, signature)) {
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature" },
      { status: 401 },
    );
  }

  const event = JSON.parse(payload) as {
    type?: string;
    data?: Record<string, unknown>;
  };
  const job = createJob("webhook", {
    source: "stripe-webhook",
    eventType: event.type ?? "unknown",
    data: event.data ?? {},
  });

  return NextResponse.json({ received: true, jobId: job.id });
}
