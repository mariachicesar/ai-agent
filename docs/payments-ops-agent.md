# Payments Ops Agent (Interview Design + Build)

This project now includes an interview-ready Payments Operations Agent at `/payments-ops` with the following architecture:

## Demo-first mode (recommended while learning)

- Set `PAYMENTS_DEMO_MODE=true` to force deterministic mock responses even if `STRIPE_MCP_URL` exists.
- Use token `demo.jwt.token` in local development (non-production) for quick auth simulation.
- Mock responses include investigation findings, drafted briefs, payment-link payloads, refund payloads, and reconciliation job outputs.

## 1) React SPA + OAuth/OIDC for support/ops

- SPA UI: `src/app/payments-ops/page.tsx`
- Token verification: `src/lib/payments-agent/auth.ts`
- API entrypoint: `src/app/api/payments-ops/route.ts`

How it works:

- Frontend sends `Authorization: Bearer <OIDC JWT>`.
  Here’s how the flow works:

The frontend (SPA) calls the API endpoint /api/payments-ops.
This API route (the "Gateway") handles authentication, request validation, and initial security checks.
The API route then invokes the orchestrator logic (from usePaymentsOpsAgent or the backend orchestrator module).
The orchestrator coordinates tool calls, approvals, and job handling.
Whenever a request hits the API route, auth.ts is called to validate the user's identity and permissions before any orchestrator or business logic runs. If authentication fails, the request is rejected early.

- Backend verifies JWT (`jose`) against either:
  - `OIDC_JWKS_URI` + `OIDC_ISSUER` + `OIDC_AUDIENCE`, or
  - `DEV_JWT_SECRET` (local fallback), or
  - decode-only fallback when issuer/audience are not set.
- Only users with role `support` or `ops` can continue.

## 2) Stripe integration via MCP server (safe tool access)

- Stripe MCP tool policy + connector: `src/lib/payments-agent/mcp-stripe.ts`
- Orchestrator computes tool proposals and enforces policy.

Safe controls:

- Tool allowlist only (`stripe.payments.lookup`, `stripe.reconciliation.run`, `stripe.payment_links.create`, `stripe.refunds.create`).
- Role-based authorization per tool.
- High-impact tools require human approval before execution.
- If `STRIPE_MCP_URL` is set, real MCP call is used.
- If not set, safe simulation is returned (good for interviews).

## 3) Bedrock operational agent + human-in-the-loop approvals

- Bedrock adapter: `src/lib/payments-agent/bedrock.ts`
- Orchestration engine: `src/lib/payments-agent/orchestrator.ts`
- Approval endpoints: `src/app/api/payments-ops/approval/route.ts`

Flow:

1. Bedrock decides operational action (`investigate`, `reconcile`, `create_payment_link`, `refund`).
2. Agent maps action to an MCP proposal.
3. If proposal is sensitive, create a pending approval record.
4. User approves/rejects via API/UI.
5. Approved actions execute MCP tool call.

## 4) Apigee governance (JWT, rate limit, protocol transform, audit)

- Apigee boundary checks: `src/lib/payments-agent/apigee.ts`

Expected ingress headers from Apigee:

- `x-apigee-jwt-validated: true`
- `x-apigee-rate-limit: <policy-value>`
- `x-request-id: <trace-id>`

If `x-apigee-jwt-validated` is missing/false, orchestration is blocked.
Audit metadata is attached to every response.

## 5) Webhooks + long-running jobs with event-driven serverless style

- `src/app/api/payments-ops/jobs/route.ts`
- `src/app/api/payments-ops/jobs/[id]/route.ts`

Design:

## Payments Ops Agent Workflow Diagram

```mermaid
graph TD
  A[SPA UI: payments-ops/page.tsx] -->|Sends request| B[API Gateway: /api/payments-ops/route.ts]
  B -->|Calls| C[Auth: payments-agent/auth.ts]
  C -->|Validates JWT & roles| B
  B -->|If authorized| D[Orchestrator: payments-agent/orchestrator.ts]
  D -->|Decides action| E[Bedrock Agent: payments-agent/bedrock.ts]
  D -->|Tool proposal| F[MCP Stripe: payments-agent/mcp-stripe.ts]
  D -->|Sensitive action| G[Approval API: /api/payments-ops/approval/route.ts]
  D -->|Job creation| H[Job Store: payments-agent/store.ts]
  H -->|Job polling| I[Job API: /api/payments-ops/jobs/route.ts]
  H -->|Job polling| J[Job API: /api/payments-ops/jobs/[id]/route.ts]
  F -->|Tool call| K[Stripe MCP Server]
  B -->|Checks| L[Apigee Governance: payments-agent/apigee.ts]
  L -->|Audit headers| B
  B -->|Returns| A
  M[Webhook: /api/webhooks/stripe/route.ts] -->|Event| H
  N[Prompt Security: payments-agent/security.ts] -->|Checks| D
```

## 6) Security hardening against prompt injection/key leakage/unauthorized tools

Controls:

## Environment variables

Create `.env.local` with:

```bash
# OIDC
OIDC_ISSUER=https://your-issuer.example.com
OIDC_AUDIENCE=your-api-audience
OIDC_JWKS_URI=https://your-issuer.example.com/.well-known/jwks.json
DEV_JWT_SECRET=dev-only-secret

# Bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Stripe MCP
STRIPE_MCP_URL=https://your-stripe-mcp-gateway.example.com/invoke
STRIPE_MCP_TOKEN=optional-mcp-bearer-token
PAYMENTS_DEMO_MODE=true

# Stripe webhook
STRIPE_WEBHOOK_SECRET=replace-with-webhook-secret
```

## Run

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/payments-ops`

## Suggested interview demo script

1. Run investigation prompt (safe read tool).
2. Run reconciliation prompt (approval requested).
3. Approve request and show tool execution.
4. Poll async job and show completion.
5. Demonstrate blocked malicious prompt (prompt injection defense).
6. Explain Apigee headers and OIDC role controls.

## Suggested prompts for mock learning

1. `Investigate mismatch on payment_intent pi_123 and draft a reconciliation brief.`
2. `Create a payment link for customer cus_001 for 15.00 USD.`
3. `Please process a partial refund of 500 cents for payment_intent pi_123.`
4. `Troubleshoot why payment_intent pi_123 is not settled yet.`
