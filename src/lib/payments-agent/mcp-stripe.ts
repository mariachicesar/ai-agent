import { createJob } from "./store";
import { StripeToolName, ToolCallProposal, UserRole } from "./types";

const TOOL_POLICY: Record<
  StripeToolName,
  { allowedRoles: UserRole[]; requiresApproval: boolean }
> = {
  "stripe.payments.lookup": {
    allowedRoles: ["support", "ops"],
    requiresApproval: false,
  },
  "stripe.reconciliation.run": {
    allowedRoles: ["ops"],
    requiresApproval: true,
  },
  "stripe.payment_links.create": {
    allowedRoles: ["support", "ops"],
    requiresApproval: true,
  },
  "stripe.refunds.create": {
    allowedRoles: ["ops"],
    requiresApproval: true,
  },
};

/**
 * Evaluates whether the caller's roles can execute a given MCP tool.
 * Step 1: Load policy for selected tool.
 * Step 2: Check if caller has an allowed role.
 * Step 3: Return allow/approval requirements to orchestrator.
 */
export function isToolAllowed(tool: StripeToolName, roles: UserRole[]) {
  const policy = TOOL_POLICY[tool];
  const hasRole = roles.some((role) => policy.allowedRoles.includes(role));

  return {
    allowed: hasRole,
    requiresApproval: policy.requiresApproval,
  };
}

/**
 * Translates orchestrator intent into a concrete Stripe MCP tool proposal.
 * Step 1: Receive intent label from orchestrator.
 * Step 2: Build deterministic tool name + arguments.
 * Step 3: Mark whether approval is required for execution.
 */
export function mapActionToProposal(
  action: "investigate" | "reconcile" | "create_payment_link" | "refund",
  context: Record<string, unknown> = {},
): ToolCallProposal {
  if (action === "reconcile") {
    return {
      tool: "stripe.reconciliation.run",
      args: {
        account_scope: "merchant_default",
        ticket_id: String(context.ticketId ?? "unknown"),
      },
      reason: "Need reconciliation run to identify ledger mismatches.",
      requiresApproval: true,
    };
  }

  if (action === "create_payment_link") {
    return {
      tool: "stripe.payment_links.create",
      args: {
        amount_cents: Number(context.amountCents ?? 1500),
        currency: String(context.currency ?? "usd"),
        customer_id: String(context.customerId ?? "unknown"),
      },
      reason: "Need a payment link to recover failed collection.",
      requiresApproval: true,
    };
  }

  if (action === "refund") {
    return {
      tool: "stripe.refunds.create",
      args: {
        payment_intent: String(context.paymentIntentId ?? "pi_missing"),
        amount_cents: Number(context.amountCents ?? 500),
      },
      reason: "User requested refund operation.",
      requiresApproval: true,
    };
  }

  return {
    tool: "stripe.payments.lookup",
    args: {
      payment_intent: String(context.paymentIntentId ?? "pi_missing"),
    },
    reason: "Need to inspect Stripe payment status.",
    requiresApproval: false,
  };
}

function buildMockSyncResult(
  proposal: ToolCallProposal,
): Record<string, unknown> {
  if (proposal.tool === "stripe.payments.lookup") {
    return {
      accepted: true,
      mode: "sync",
      mock: true,
      tool: proposal.tool,
      payment: {
        payment_intent: String(proposal.args.payment_intent ?? "pi_missing"),
        status: "requires_capture",
        amount_cents: 1500,
        currency: "usd",
        last_event: "payment_intent.amount_capturable_updated",
        risk_score: 38,
      },
      troubleshooting: {
        likely_root_cause: "Settlement delay after partial authorization.",
        next_actions: [
          "confirm capture window",
          "verify webhook delivery",
          "notify merchant of settlement lag",
        ],
      },
      drafted_brief: {
        title: "Payment mismatch investigation summary",
        summary:
          "Payment is capturable but not settled yet. Evidence suggests expected lag rather than permanent failure.",
      },
    };
  }

  if (proposal.tool === "stripe.payment_links.create") {
    return {
      accepted: true,
      mode: "sync",
      mock: true,
      tool: proposal.tool,
      payment_link: {
        id: "plink_demo_001",
        url: "https://buy.stripe.com/test_demo_link_001",
        amount_cents: Number(proposal.args.amount_cents ?? 1500),
        currency: String(proposal.args.currency ?? "usd"),
        customer_id: String(proposal.args.customer_id ?? "cus_demo"),
        expires_at: "2026-03-01T00:00:00.000Z",
      },
      drafted_brief: {
        title: "Recovery link generated",
        summary:
          "Generated a payment recovery link and attached it to the support response draft.",
      },
    };
  }

  if (proposal.tool === "stripe.refunds.create") {
    return {
      accepted: true,
      mode: "sync",
      mock: true,
      tool: proposal.tool,
      refund: {
        id: "re_demo_001",
        payment_intent: String(proposal.args.payment_intent ?? "pi_missing"),
        amount_cents: Number(proposal.args.amount_cents ?? 500),
        status: "pending",
        reason: "requested_by_customer",
      },
      drafted_brief: {
        title: "Refund operation initiated",
        summary:
          "Refund created and queued for settlement confirmation. Customer communication draft prepared.",
      },
    };
  }

  return {
    accepted: true,
    mode: "sync",
    mock: true,
    tool: proposal.tool,
    sample: {
      id: `sim_${proposal.tool.replace(/\./g, "_")}`,
      status: "ok",
    },
  };
}

/**
 * Executes an approved Stripe MCP tool call.
 *
 * Step 1: If MCP endpoint exists, forward request to remote server.
 * Step 2: If no endpoint, run deterministic local simulation.
 * Step 3: Return either sync result or async job payload.
 */
export async function callStripeMcpTool(
  proposal: ToolCallProposal,
): Promise<Record<string, unknown>> {
  const mcpEndpoint = process.env.STRIPE_MCP_URL;
  const demoMode = process.env.PAYMENTS_DEMO_MODE === "true";

  if (mcpEndpoint && !demoMode) {
    const response = await fetch(mcpEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: process.env.STRIPE_MCP_TOKEN
          ? `Bearer ${process.env.STRIPE_MCP_TOKEN}`
          : "",
      },
      body: JSON.stringify({
        tool: proposal.tool,
        arguments: proposal.args,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stripe MCP call failed with status ${response.status}`);
    }

    return response.json();
  }

  if (proposal.tool === "stripe.reconciliation.run") {
    const ticketId = String(proposal.args.ticket_id ?? "unknown");
    const job = createJob("reconciliation", {
      source: "stripe-mcp",
      proposal,
      mockResult: {
        reconciliationSummary:
          "3 mismatches found across authorization/capture timelines.",
        ticketId,
        mismatches: [
          {
            payment_intent: "pi_123",
            expected: "captured",
            actual: "requires_capture",
            amount_cents: 1500,
          },
          {
            payment_intent: "pi_778",
            expected: "succeeded",
            actual: "processing",
            amount_cents: 4200,
          },
        ],
        drafted_brief: {
          title: `Reconciliation brief for ${ticketId}`,
          summary:
            "Primary issue is settlement lag; no evidence of key compromise or unauthorized tool usage.",
          recommended_actions: [
            "confirm capture automation",
            "replay delayed webhook events",
            "send merchant-facing update",
          ],
        },
      },
    });

    return {
      accepted: true,
      mode: "async",
      mock: true,
      job,
      note: "Simulated Stripe reconciliation job queued.",
    };
  }

  return buildMockSyncResult(proposal);
}
