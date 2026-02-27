import { NextRequest, NextResponse } from "next/server";
import { callStripeMcpTool } from "@/lib/payments-agent/mcp-stripe";
import { decideApproval, getApproval } from "@/lib/payments-agent/store";

/**
 * Receives human approval decision and executes pending tool call when approved.
 * Step 1: Read approval id + decision from request.
 * Step 2: Persist approval state (approved/rejected).
 * Step 3: Execute tool only when approval is granted.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const approvalId = String(body.approvalId ?? "");
    const decision = body.decision === "approved" ? "approved" : "rejected";

    if (!approvalId) {
      return NextResponse.json(
        { error: "approvalId is required" },
        { status: 400 },
      );
    }

    const approval = decideApproval(
      approvalId,
      decision,
      body.note ? String(body.note) : undefined,
    );
    if (!approval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 },
      );
    }

    if (approval.status !== "approved") {
      return NextResponse.json({ message: "Action rejected", approval });
    }

    const result = await callStripeMcpTool(approval.proposal);
    return NextResponse.json({
      message: `Approved and executed ${approval.proposal.tool}`,
      approval,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Approval processing failed",
      },
      { status: 500 },
    );
  }
}

/**
 * Returns approval record by id for UI status checks.
 * Step 1: Validate query id.
 * Step 2: Lookup approval record.
 * Step 3: Return record or not-found response.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id query param is required" },
      { status: 400 },
    );
  }

  const approval = getApproval(id);
  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  return NextResponse.json({ approval });
}
