import { headers } from "next/headers";

/**
 * Reads gateway-provided headers used for ingress trust checks and auditing.
 * Step 1: Pull Apigee trust and rate headers.
 * Step 2: Assign request id fallback when missing.
 * Step 3: Return normalized gateway context.
 */
export async function validateApigeeHeaders() {
  const h = await headers();

  const apigeeJwt = h.get("x-apigee-jwt-validated") === "true";
  const apigeeRate = h.get("x-apigee-rate-limit") ?? "unknown";
  const requestId = h.get("x-request-id") ?? crypto.randomUUID();

  return {
    requestId,
    apigeeJwt,
    apigeeRate,
    protocol: h.get("x-forwarded-proto") ?? "https",
  };
}
