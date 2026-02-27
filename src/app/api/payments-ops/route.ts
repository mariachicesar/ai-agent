import { NextRequest, NextResponse } from "next/server";
import { verifyOidcToken } from "@/lib/payments-agent/auth";
import {
  getBearerHeader,
  runPaymentsOrchestrator,
} from "@/lib/payments-agent/orchestrator";

/**
 * Payments operations entrypoint.
 * Step 1: Validate caller identity from bearer token.
 * Step 2: Extract user prompt + context payload.
 * Step 3: Execute orchestrator and return normalized result.
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Resolve bearer token from server/request headers.
    const authHeader =
      (await getBearerHeader()) ?? request.headers.get("authorization");

    // Step 2: Verify OIDC token and produce role-aware session.
    const session = await verifyOidcToken(authHeader);

    // Step 3: Parse inbound payload from UI.
    const body = await request.json();
    let prompt: string | undefined;

    // Step 4: Support direct `prompt` payload.
    if (typeof body.prompt === "string") {
      prompt = body.prompt;
    } else if (Array.isArray(body?.messages)) {
      // Step 5: Support chat-style payload by selecting last user message.
      const userMessages = body.messages.filter(
        (message: { role?: string; content?: string }) =>
          message.role === "user" && typeof message.content === "string",
      );
      prompt = userMessages[userMessages.length - 1]?.content;
    }

    // Step 6: Reject malformed request before orchestration.
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Step 7: Execute orchestration with prompt + operational context.
    const result = await runPaymentsOrchestrator(
      {
        prompt,
        context: {
          ticketId: body?.context?.ticketId,
          paymentIntentId: body?.context?.paymentIntentId,
          customerId: body?.context?.customerId,
        },
      },
      session,
    );

    // Step 8: Map blocked orchestration to 403 for client clarity.
    const status = result.blocked ? 403 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    // Step 9: Normalize errors into explicit status classes.
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run payments ops orchestrator";

    const isAuthError =
      message.includes("Missing Bearer token") ||
      message.includes("Invalid JWT") ||
      message.includes("OIDC verification not configured");
    const isForbidden = message.includes("Unauthorized role");

    // Step 10: Return authz/authn-aware error status.
    return NextResponse.json(
      {
        error: message,
      },
      { status: isForbidden ? 403 : isAuthError ? 401 : 500 },
    );
  }
}
