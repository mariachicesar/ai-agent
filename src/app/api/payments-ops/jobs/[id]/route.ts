import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/payments-agent/store";

/**
 * Polls a job and advances demo state transitions for long-running workflows.
 * Step 1: Load job by id.
 * Step 2: Advance queued/running state in demo mode.
 * Step 3: Return updated job snapshot.
 */
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "queued") {
    updateJob(id, { status: "running" });
  } else if (job.status === "running") {
    const mockResult =
      (job.payload?.mockResult as Record<string, unknown> | undefined) ??
      undefined;

    updateJob(id, {
      status: "completed",
      result: mockResult ?? {
        reconciliationSummary:
          "3 mismatches found and drafted brief generated.",
        nextActions: [
          "confirm settlement lag",
          "notify merchant",
          "attach evidence",
        ],
      },
    });
  }

  const updated = getJob(id);
  return NextResponse.json({ job: updated });
}
