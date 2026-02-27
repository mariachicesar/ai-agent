"use client";

import Link from "next/link";
import { useState } from "react";
import { usePaymentsOpsAgent } from "@/hooks/usePaymentsOpsAgent";

export default function PaymentsOpsPage() {
    const [prompt, setPrompt] = useState("Investigate mismatch on payment_intent pi_123 and draft a reconciliation brief.");
    const [token, setToken] = useState("demo.jwt.token");
    const [ticketId, setTicketId] = useState("INC-10245");
    const [paymentIntentId, setPaymentIntentId] = useState("pi_123");
    const [customerId, setCustomerId] = useState("cus_001");
    const [approvalNote, setApprovalNote] = useState("Approved by operations manager");
    const [approvalResult, setApprovalResult] = useState<string>("");
    const [jobStatus, setJobStatus] = useState<string>("");

    const { run, decide, pollJob, result, error, isLoading } = usePaymentsOpsAgent();

    /**
     * Form submit flow
     * Step 1: Prevent full-page reload.
     * Step 2: Clear prior approval/job outputs so each run starts fresh.
     * Step 3: Send prompt + auth/context to orchestrator via `run`.
     * Step 4: Hook handles API errors and loading state.
     */
    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setApprovalResult("");
        setJobStatus("");

        try {
            await run({
                prompt,
                token,
                ticketId,
                paymentIntentId,
                customerId,
            });
        } catch {
            // handled by hook
        }
    };

    /**
     * Approval flow (for sensitive tool calls)
     * Step 1: Ensure there is a pending approval id.
     * Step 2: Send approved/rejected decision to API.
     * Step 3: If decision triggers async job, poll twice to show progression.
     * Step 4: Render approval output + job snapshots for demo visibility.
     */
    const handleDecision = async (decision: "approved" | "rejected") => {
        if (!result?.approval?.id) {
            return;
        }

        try {
            const data = await decide(result.approval.id, decision, approvalNote);
            setApprovalResult(JSON.stringify(data, null, 2));

            const jobId = data?.result?.job?.id;
            if (typeof jobId === "string") {
                const firstPoll = await pollJob(jobId);
                const secondPoll = await pollJob(jobId);
                setJobStatus(JSON.stringify({ firstPoll, secondPoll }, null, 2));
            }
        } catch (err) {
            setApprovalResult(err instanceof Error ? err.message : "Approval failed");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                    ← Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-2">Payments Ops Agent (Interview MVP)</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    OAuth/OIDC-aware operations workflow with Apigee headers, Bedrock orchestration, Stripe MCP tool policy, and human approvals.
                </p>

                {/* Inputs map directly to orchestrator payload: prompt + OIDC token + payment context */}
                <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-3 text-sm"
                        rows={4}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={token} onChange={(e) => setToken(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm" placeholder="OIDC bearer token" />
                        <input value={ticketId} onChange={(e) => setTicketId(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm" placeholder="Ticket ID" />
                        <input value={paymentIntentId} onChange={(e) => setPaymentIntentId(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm" placeholder="Payment Intent" />
                        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm" placeholder="Customer ID" />
                    </div>

                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                        {isLoading ? "Running..." : "Run Operational Agent"}
                    </button>
                </form>

                {/* Hook-level error state from `run` appears here */}
                {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

                {result && (
                    <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Orchestrator Result</h2>

                        {/* Traceability panel for interview demos (gateway -> orchestrator correlation) */}
                        <div className="p-3 rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                            <div className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-semibold mb-1">
                                Request Trace
                            </div>
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                                Request ID: <span className="font-mono">{result.audit?.requestId ?? "N/A"}</span>
                            </div>
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                                Apigee Verified: {result.audit?.apigeeVerified ? "true" : "false"}
                            </div>
                        </div>

                        <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{JSON.stringify(result, null, 2)}</pre>

                        {result.approval?.status === "pending" && (
                            <div className="space-y-3">
                                <p className="text-sm text-amber-700 dark:text-amber-300">Human approval required before tool execution.</p>
                                <input
                                    value={approvalNote}
                                    onChange={(e) => setApprovalNote(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                                    placeholder="Approval note"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleDecision("approved")} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700" type="button">Approve</button>
                                    <button onClick={() => handleDecision("rejected")} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700" type="button">Reject</button>
                                </div>
                            </div>
                        )}

                        {approvalResult && (
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Approval Decision Output</h3>
                                <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{approvalResult}</pre>
                            </div>
                        )}

                        {jobStatus && (
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Async Job Polling</h3>
                                <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{jobStatus}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
