"use client"
import { useAgentPromptChain } from "@/hooks/useSwrAgent";
import Link from "next/link";
import { useState } from "react";

const CalendarAgentPage = () => {
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>("default");
    const [userInput, setUserInput] = useState<string>("");

    const { sendMessage, data, isLoading, error, messages } = useAgentPromptChain();

    const handleWorkflowClick = (workflow: string) => {
        setSelectedWorkflow(workflow);
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        // Call the function to process the user input
        console.log("User Input:", userInput);
        try {
            await sendMessage(userInput, selectedWorkflow);
            setUserInput(""); // Clear input after successful submission
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header Section */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Navigation */}
                    <div className="mb-8">
                        <Link
                            href="/"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Chat Demo
                        </Link>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                        {/* Title Section */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                AI Agent Workflow Patterns
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
                                Learn three fundamental workflow patterns for building effective AI agents, based on Anthropic&apos;s production experience.
                            </p>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                Anthropic&apos;s Agent Patterns
                            </div>
                        </div>

                        {/* Workflow Pattern Cards */}
                        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-8">
                            {/* Prompt Chaining */}
                            <button className={`p-6 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow ${selectedWorkflow === "promptChaining" ? "ring-2 ring-blue-500" : ""}`} onClick={() => handleWorkflowClick("promptChaining")}>
                                <div className={`flex items-center mb-4 `} >
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prompt Chaining</h3>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Sequential Processing</div>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                                    Decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one. Trade latency for higher accuracy.
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Best for:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Tasks easily decomposed into fixed subtasks</li>
                                        <li>• When you need higher accuracy over speed</li>
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Examples:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Generate marketing copy → translate to different language</li>
                                        <li>• Write outline → check criteria → write document</li>
                                    </ul>
                                </div>
                            </button>

                            {/* Routing */}
                            <button className={`p-6 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow ${selectedWorkflow === "routing" ? "ring-2 ring-blue-500" : ""}`} onClick={() => handleWorkflowClick("routing")}>
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Routing</h3>
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">Smart Classification</div>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                                    Classifies an input and directs it to a specialized follow-up task. Allows separation of concerns and building more specialized prompts.
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Best for:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Complex tasks with distinct categories</li>
                                        <li>• When classification can be handled accurately</li>
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Examples:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Customer service: questions → refunds → tech support</li>
                                        <li>• Route easy questions to Haiku, hard ones to Sonnet</li>
                                    </ul>
                                </div>
                            </button>

                            {/* Parallelization */}
                            <button className={`p-6 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow ${selectedWorkflow === "parallelization" ? "ring-2 ring-blue-500" : ""}`} onClick={() => handleWorkflowClick("parallelization")}>
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Parallelization</h3>
                                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Concurrent Processing</div>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                                    LLMs work simultaneously on tasks through sectioning (independent subtasks) or voting (same task multiple times for diverse outputs).
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Best for:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Tasks that can be parallelized for speed</li>
                                        <li>• When multiple perspectives increase confidence</li>
                                    </ul>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Examples:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• Sectioning: Separate guardrails from core response</li>
                                        <li>• Voting: Multiple code vulnerability reviews</li>
                                    </ul>
                                </div>
                            </button>
                        </div>

                        {/* Implementation Guide */}
                        <div className="py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                            <div className="max-w-3xl mx-auto px-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                        Implementation
                                    </h3>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <label htmlFor="calendar-prompt" className="sr-only">Calendar Prompt</label>
                                    <div className="grid gap-6 mb-6">
                                        <input
                                            id="calendar-prompt"
                                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2"
                                            placeholder="Enter your calendar-related prompt here"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!userInput.trim() || isLoading}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                        >
                                            {isLoading ? "Processing..." : "Send Message"}
                                        </button>
                                    </div>
                                </form>

                                {/* Results Section */}
                                {(messages.length > 0 || error) && (
                                    <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Results</h4>

                                        {error && (
                                            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
                                                <strong>Error:</strong> {error}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {messages.map((message, index) => (
                                                <div
                                                    key={index}
                                                    className={`p-4 rounded-lg ${message.role === "user"
                                                            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                                                            : "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
                                                        }`}
                                                >
                                                    <div className="font-semibold mb-2 capitalize">
                                                        {message.role === "user" ? "You" : "AI Assistant"}
                                                    </div>
                                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {data && (
                                            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded-lg">
                                                <h5 className="font-semibold mb-2">Usage Stats:</h5>
                                                <p className="text-sm">
                                                    Workflow: <span className="font-medium">{selectedWorkflow}</span>
                                                    {data.usage && (
                                                        <>
                                                            <br />
                                                            Tokens: {data.usage.prompt_tokens} prompt + {data.usage.completion_tokens} completion = {data.usage.total_tokens} total
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}


                                <div className="text-center space-y-4">
                                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                            Workflows: Predictable paths
                                        </span>
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                                            Agents: Flexible decisions
                                        </span>
                                    </div>
                                    <a
                                        href="https://www.anthropic.com/engineering/building-effective-agents"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Read Full Anthropic Guide
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarAgentPage;
