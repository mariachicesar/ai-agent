"use client";

import { useCallback, useState } from "react";

interface OrchestratorResult {
  message: string;
  blocked?: boolean;
  approval?: {
    id: string;
    status: "pending" | "approved" | "rejected";
    proposal: {
      tool: string;
    };
  };
  job?: {
    id: string;
    status: string;
  };
  toolResult?: Record<string, unknown>;
  audit?: {
    requestId: string;
    apigeeVerified: boolean;
  };
}

/**
 * Client hook that wraps orchestrator run, approval decisions, and job polling.
 * Step 1: Submit operational requests.
 * Step 2: Resolve human approval actions.
 * Step 3: Poll async job progress for UI updates.
 */
export function usePaymentsOpsAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorResult | null>(null);

  /**
   * Submits a payments-ops request with token and context.
   * Step 1: Send request + gateway headers.
   * Step 2: Parse response and update local state.
   */
  const run = useCallback(
    async (params: {
      prompt: string;
      token: string;
      ticketId?: string;
      paymentIntentId?: string;
      customerId?: string;
    }) => {
      // Step 1: Enter request lifecycle and reset stale error state.
      setIsLoading(true);
      setError(null);

      try {
        // Step 2: Call orchestrator endpoint with auth + Apigee simulation headers.
        const response = await fetch("/api/payments-ops", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${params.token}`,
            "x-apigee-jwt-validated": "true",
            "x-apigee-rate-limit": "bucket-100",
          },
          body: JSON.stringify({
            prompt: params.prompt,
            context: {
              ticketId: params.ticketId,
              paymentIntentId: params.paymentIntentId,
              customerId: params.customerId,
            },
          }),
        });

        // Step 3: Parse payload and normalize non-2xx responses into JS errors.
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Orchestrator failed");
        }

        // Step 4: Store orchestrator result for page rendering.
        setResult(data);
        return data as OrchestratorResult;
      } catch (err) {
        // Step 5: Persist error for UI and rethrow for caller-specific handling.
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        // Step 6: Exit request lifecycle.
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Sends human approval/rejection decision for pending actions.
   * Step 1: Post decision payload.
   * Step 2: Return execution result or error.
   */
  const decide = useCallback(
    async (
      approvalId: string,
      decision: "approved" | "rejected",
      note?: string,
    ) => {
      const response = await fetch("/api/payments-ops/approval", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          approvalId,
          decision,
          note,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Approval decision failed");
      }

      return data;
    },
    [],
  );

  /**
   * Polls long-running job status from server.
   * Step 1: Query job endpoint.
   * Step 2: Return latest status snapshot.
   */
  const pollJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/payments-ops/jobs/${jobId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Job polling failed");
    }

    return data;
  }, []);

  return {
    run,
    decide,
    pollJob,
    result,
    error,
    isLoading,
  };
}
