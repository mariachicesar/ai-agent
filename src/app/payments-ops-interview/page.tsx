"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { usePaymentsOpsAgent } from "@/hooks/usePaymentsOpsAgent";
import { Agent } from "http";
import { set } from "zod/v4";
import { setLazyProp } from "next/dist/server/api-utils";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

interface OrchestratorResults {
    message: string;
}

function usePaymentsAgent() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<OrchestratorResults | null>(null)

    const run = useCallback(async (params: {
        prompt: string;
        token: string;
        customerId: string;
    }) => {
        setIsLoading(true)
        setError(null)
        try {
            const resp = await fetch("/api/payments", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${params.token}`
                },
                body: JSON.stringify({
                    prompt: params.prompt,
                    context: {
                        customerId: params.customerId,
                    },
                })
            })
            const data = await resp.json();
            setResult(data)
            return data
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        }
        finally {
            setIsLoading(false)
        }
    }, [])

    const decide = useCallback(() => {

    }, [])

    return {
        run, decide, result, error, isLoading
    }
}

export default function PaymentsOpsInterviewPage() {
    /*
    State - prompt, approvalResult, jobStatus
    Submit
    Agent Hook
        a. Gateway (auth, jwt, userId, tokenId etc)
        b. Orchestrator
        c. Specialist Agent
    Handle Decision
    Clear Chat
    */
    const [promptInput, setPromptInput] = useState<string>("")
    const [approvalResponse, setApprovalResponse] = useState<string>("")
    const [token, setToken] = useState<string>("")
    const [customerId, setCustomerId] = useState<string>("")

    const { run, decide, result, error, isLoading } = usePaymentsAgent();

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setApprovalResponse("")
        try {
            await run({
                prompt: promptInput,
                token,
                customerId
            })
        }
        catch {

        }

    };

    const handleDecision = async (decision: "approved" | "rejected") => {
        // if (!result?.approval?.id) {
        //     return;
        // }

        // try {
        //     const data = await decide(result.approval.id, decision, approvalNote);
        //     setApprovalResult(JSON.stringify(data, null, 2));

        //     setChatMessages((previous) => [
        //         ...previous,
        //         {
        //             role: "assistant",
        //             content:
        //                 decision === "approved"
        //                     ? "Approval accepted. Executing mock tool call and polling job status."
        //                     : "Approval rejected. Tool execution was stopped.",
        //         },
        //     ]);

        //     const jobId = data?.result?.job?.id;
        //     if (typeof jobId === "string") {
        //         const firstPoll = await pollJob(jobId);
        //         const secondPoll = await pollJob(jobId);
        //         const snapshots = { firstPoll, secondPoll };
        //         setJobStatus(JSON.stringify(snapshots, null, 2));
        //         setChatMessages((previous) => [
        //             ...previous,
        //             {
        //                 role: "assistant",
        //                 content: `Job ${jobId} progressed from ${firstPoll.job?.status ?? "unknown"} to ${secondPoll.job?.status ?? "unknown"}.`,
        //             },
        //         ]);
        //     }
        // } catch (decisionError) {
        //     const message = decisionError instanceof Error ? decisionError.message : "Approval failed";
        //     setApprovalResult(message);
        //     setChatMessages((previous) => [
        //         ...previous,
        //         { role: "assistant", content: `Approval action failed: ${message}` },
        //     ]);
        // }
    };

    const clearChat = () => {

    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                    ← Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-2">Payments Ops Interview Lab</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Practice orchestration, gateway-aware requests, human approvals, and async jobs using mock responses.
                </p>
                <textarea
                    value={promptInput}
                    onChange={(e) => {
                        setPromptInput(e.target.value)
                    }}
                    className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm w-full min-h-[100px] resize-y"
                    placeholder="Type your prompt here..."
                />
                <button onClick={() => onSubmit}>Prompt Submit</button>

                {/* <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                            placeholder="OIDC bearer token"
                        />
                        <input
                            value={ticketId}
                            onChange={(event) => setTicketId(event.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                            placeholder="Ticket ID"
                        />
                        <input
                            value={paymentIntentId}
                            onChange={(event) => setPaymentIntentId(event.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                            placeholder="Payment Intent"
                        />
                        <input
                            value={customerId}
                            onChange={(event) => setCustomerId(event.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                            placeholder="Customer ID"
                        />
                    </div>

                    <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                        {chatMessages.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Start by sending a payments ops prompt.</p>
                        ) : (
                            chatMessages.map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`p-3 rounded-lg text-sm ${message.role === "user"
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 ml-8"
                                        : "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 mr-8"
                                        }`}
                                >
                                    <div className="font-semibold mb-1">{message.role === "user" ? "You" : "Agent"}</div>
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={onSubmit} className="flex gap-2">
                        <input
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-3 text-sm"
                            placeholder="Example: Investigate mismatch on payment_intent pi_123 and draft a reconciliation brief."
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isLoading ? "Running..." : "Send"}
                        </button>
                        <button
                            type="button"
                            onClick={clearChat}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                        >
                            Clear
                        </button>
                    </form>

                    {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

                    {result?.approval?.status === "pending" && (
                        <div className="space-y-3 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                Approval required for: <span className="font-semibold">{result.approval.proposal.tool}</span>
                            </p>
                            <input
                                value={approvalNote}
                                onChange={(event) => setApprovalNote(event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm"
                                placeholder="Approval note"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDecision("approved")}
                                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDecision("rejected")}
                                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <div className="p-3 rounded border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 text-sm text-blue-900 dark:text-blue-100">
                                Request ID: <span className="font-mono">{result.audit?.requestId ?? "N/A"}</span>
                                <br />
                                Apigee Verified: {result.audit?.apigeeVerified ? "true" : "false"}
                            </div>

                            <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}

                    {approvalResult && (
                        <div>
                            <h2 className="font-medium text-gray-900 dark:text-white mb-2">Approval Decision Output</h2>
                            <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{approvalResult}</pre>
                        </div>
                    )}

                    {jobStatus && (
                        <div>
                            <h2 className="font-medium text-gray-900 dark:text-white mb-2">Async Job Polling</h2>
                            <pre className="text-xs overflow-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">{jobStatus}</pre>
                        </div>
                    )}
                </div> */}
            </div>
        </div>
    );
}
