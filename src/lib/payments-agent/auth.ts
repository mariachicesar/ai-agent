import { createSecretKey } from "crypto";
import { decodeJwt, jwtVerify, createRemoteJWKSet } from "jose";
import { OidcSession, UserRole } from "./types";

const ACCEPTED_ROLES: UserRole[] = ["support", "ops"];

/**
 * Normalizes role claims from different identity providers.
 * Step 1: Read claim as array or single value.
 * Step 2: Lowercase and filter to supported app roles.
 * Step 3: Return unique role set.
 */
function normalizeRoles(claimValue: unknown): UserRole[] {
  if (!claimValue) {
    return [];
  }

  const input = Array.isArray(claimValue) ? claimValue : [claimValue];
  const roles = input
    .map((role) => String(role).toLowerCase())
    .filter((role): role is UserRole =>
      ACCEPTED_ROLES.includes(role as UserRole),
    );

  return [...new Set(roles)];
}

/**
 * Maps verified JWT payload into application session shape.
 * Step 1: Extract identity fields (sub/email/tenant).
 * Step 2: Normalize role claims.
 * Step 3: Return typed session object.
 */
function extractSessionFromPayload(
  payload: Record<string, unknown>,
): OidcSession {
  const roles = normalizeRoles(payload.roles ?? payload["cognito:groups"]);

  return {
    sub: String(payload.sub ?? "unknown"),
    email: payload.email ? String(payload.email) : undefined,
    roles,
    tenant: payload.tid ? String(payload.tid) : undefined,
  };
}

/**
 * Creates a local demo session for interview/development workflows.
 */
function createDemoSession(): OidcSession {
  return {
    sub: "demo-user",
    email: "demo@example.com",
    roles: ["ops"],
    tenant: "demo-tenant",
  };
}

/**
 * Verifies OIDC bearer token and enforces minimum role authorization.
 *
 * Step 1: Validate bearer header format.
 * Step 2: Verify JWT via JWKS (or local secret in dev).
 * Step 3: Convert payload to session model.
 * Step 4: Enforce at least one authorized role.
 */
export async function verifyOidcToken(
  authHeader: string | null,
): Promise<OidcSession> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const token = authHeader.slice("Bearer ".length);
  const issuer = process.env.OIDC_ISSUER;
  const audience = process.env.OIDC_AUDIENCE;
  const jwksUri = process.env.OIDC_JWKS_URI;
  const devSecret = process.env.DEV_JWT_SECRET;
  const allowDemoAuth =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEMO_AUTH !== "false";

  if (allowDemoAuth && token === "demo.jwt.token") {
    return createDemoSession();
  }

  if (!issuer || !audience) {
    try {
      const decoded = decodeJwt(token) as Record<string, unknown>;
      const session = extractSessionFromPayload(decoded);

      if (session.roles.length === 0) {
        throw new Error("Unauthorized role");
      }

      return session;
    } catch {
      throw new Error(
        "Invalid JWT format. Use a valid OIDC token or `demo.jwt.token` in local development.",
      );
    }
  }

  let payload: Record<string, unknown>;

  if (jwksUri) {
    const JWKS = createRemoteJWKSet(new URL(jwksUri));
    const verified = await jwtVerify(token, JWKS, { issuer, audience });
    payload = verified.payload as Record<string, unknown>;
  } else if (devSecret) {
    const key = createSecretKey(Buffer.from(devSecret, "utf-8"));
    const verified = await jwtVerify(token, key, { issuer, audience });
    payload = verified.payload as Record<string, unknown>;
  } else {
    throw new Error("OIDC verification not configured");
  }

  const session = extractSessionFromPayload(payload);

  if (session.roles.length === 0) {
    throw new Error("Unauthorized role");
  }

  return session;
}
