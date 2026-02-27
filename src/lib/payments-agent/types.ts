export type UserRole = "support" | "ops";

export interface OidcSession {
  sub: string;
  email?: string;
  roles: UserRole[];
  tenant?: string;
}

export interface AgentRequest {
  prompt: string;
  context?: {
    ticketId?: string;
    paymentIntentId?: string;
    customerId?: string;
  };
}

export interface ToolCallProposal {
  tool: StripeToolName;
  args: Record<string, string | number | boolean | null | undefined>;
  reason: string;
  requiresApproval: boolean;
}

export type StripeToolName =
  | "stripe.payments.lookup"
  | "stripe.reconciliation.run"
  | "stripe.payment_links.create"
  | "stripe.refunds.create";

export interface ApprovalRecord {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: OidcSession;
  proposal: ToolCallProposal;
  decisionNote?: string;
}

export interface AsyncJobRecord {
  id: string;
  type: "reconciliation" | "webhook";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export interface OrchestratorResponse {
  message: string;
  riskLevel: "low" | "medium" | "high";
  blocked?: boolean;
  approval?: ApprovalRecord;
  toolResult?: Record<string, unknown>;
  job?: AsyncJobRecord;
  audit: {
    requestId: string;
    apigeeVerified: boolean;
    userSub: string;
  };
}
