import { randomUUID } from "crypto";
import { ApprovalRecord, AsyncJobRecord } from "./types";

const approvals = new Map<string, ApprovalRecord>();
const jobs = new Map<string, AsyncJobRecord>();

/**
 * Creates a pending approval record for a sensitive tool proposal.
 */
export function createApproval(
  record: Omit<ApprovalRecord, "id" | "createdAt" | "status">,
): ApprovalRecord {
  const created: ApprovalRecord = {
    id: `apr_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    status: "pending",
    ...record,
  };

  approvals.set(created.id, created);
  return created;
}

/**
 * Retrieves a single approval by id.
 */
export function getApproval(id: string): ApprovalRecord | undefined {
  return approvals.get(id);
}

/**
 * Applies approve/reject decision to an existing approval.
 */
export function decideApproval(
  id: string,
  decision: "approved" | "rejected",
  decisionNote?: string,
): ApprovalRecord | undefined {
  const approval = approvals.get(id);
  if (!approval) {
    return undefined;
  }

  const updated: ApprovalRecord = {
    ...approval,
    status: decision,
    decisionNote,
  };

  approvals.set(id, updated);
  return updated;
}

/**
 * Creates an async job record for webhook or reconciliation workflows.
 */
export function createJob(
  type: AsyncJobRecord["type"],
  payload: Record<string, unknown>,
): AsyncJobRecord {
  const now = new Date().toISOString();
  const job: AsyncJobRecord = {
    id: `job_${randomUUID()}`,
    type,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    payload,
  };

  jobs.set(job.id, job);
  return job;
}

/**
 * Patches a job state/result and updates modification timestamp.
 */
export function updateJob(
  id: string,
  patch: Partial<AsyncJobRecord>,
): AsyncJobRecord | undefined {
  const existing = jobs.get(id);
  if (!existing) {
    return undefined;
  }

  const updated: AsyncJobRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);
  return updated;
}

/**
 * Retrieves a single async job by id.
 */
export function getJob(id: string): AsyncJobRecord | undefined {
  return jobs.get(id);
}

/**
 * Lists jobs newest-first for dashboard/polling views.
 */
export function listJobs(): AsyncJobRecord[] {
  return [...jobs.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
