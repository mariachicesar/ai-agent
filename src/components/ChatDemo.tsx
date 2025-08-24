'use client';

import { useEffect, useState } from 'react';
import { useSWROpenAI, useSWRCompletion, useSWRValidation } from '@/hooks/useSWROpenAI';

export default function ChatDemo() {
    const [input, setInput] = useState('');
    const [completionInput, setCompletionInput] = useState('');
    const [validationInput, setValidationInput] = useState('');

    // Chat conversation hook
    const { messages, sendMessage, clearMessages, isLoading, error } = useSWROpenAI({
        model: 'gpt-3.5-turbo'
    });

    // One-off completion hook
    const {
        complete,
        isLoading: completionLoading,
        error: completionError,
        data: completionData
    } = useSWRCompletion({
        model: 'gpt-3.5-turbo'
    });

    const {
        validateOutput,
        isLoading: validationLoading,
        error: validationError,
        data: validationData
    } = useSWRValidation({
        model: 'gpt-3.5-turbo'
    });

    useEffect(() => {
        if (validationData) {
            console.log('Validation successful:', validationData);
        }
    }, [validationData]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            await sendMessage(input);
            setInput('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleCompletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!completionInput.trim()) return;

        try {
            await complete(completionInput);
            setCompletionInput('');
        } catch (err) {
            console.error('Failed to get completion:', err);
        }
    };

    const handleCompletionValidation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validationInput.trim()) return;

        try {
            await validateOutput(validationInput);
            setValidationInput('');
        } catch (err) {
            console.error('Failed to validate output:', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 text-black space-y-8">
            <h1 className="text-3xl font-bold text-center">OpenAI + SWR + Next.js Demo</h1>

            {/* Chat Section */}
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Chat Conversation</h2>

                {/* Messages */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {messages.length === 0 && (
                        <p className="text-gray-500 text-center">Start a conversation below...</p>
                    )}
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg ${message.role === 'user'
                                ? 'bg-blue-100 ml-12'
                                : message.role === 'assistant'
                                    ? 'bg-gray-100 mr-12'
                                    : 'bg-yellow-100'
                                }`}
                        >
                            <div className="font-medium text-sm text-gray-600 mb-1">
                                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                            </div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                    ))}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                    <button
                        type="button"
                        onClick={clearMessages}
                        disabled={isLoading}
                        className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                        Clear
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
                        Error: {error}
                    </div>
                )}
            </div>

            {/* Completion Section */}
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">One-off Completion</h2>

                <form onSubmit={handleCompletion} className="space-y-4">
                    <div>
                        <textarea
                            value={completionInput}
                            onChange={(e) => setCompletionInput(e.target.value)}
                            placeholder="Enter a prompt for completion..."
                            className="w-full p-3 border-2 border-gray-300 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={completionLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={completionLoading || !completionInput.trim()}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {completionLoading ? 'Generating...' : 'Complete'}
                    </button>
                </form>

                {completionData && (
                    <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                        <div className="font-medium text-green-800 mb-2">Completion Result:</div>
                        <div className="whitespace-pre-wrap text-green-700">
                            {typeof completionData.message === 'string' ? completionData.message : JSON.stringify(completionData.message)}
                        </div>
                        {completionData.usage && (
                            <div className="mt-2 text-sm text-green-600">
                                Tokens used: {completionData.usage.total_tokens}
                                (prompt: {completionData.usage.prompt_tokens},
                                completion: {completionData.usage.completion_tokens})
                            </div>
                        )}
                    </div>
                )}

                {completionError && (
                    <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
                        Error: {completionError}
                    </div>
                )}
            </div>

            {/* Completion Section Schematic Validation*/}
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
                <h2 className="text-2xl font-semibold mb-4">Output Validation</h2>

                <form onSubmit={handleCompletionValidation} className="space-y-4">
                    <div>
                        <textarea
                            value={validationInput}
                            onChange={(e) => setValidationInput(e.target.value)}
                            placeholder="Enter a prompt for validation..."
                            className="w-full p-3 border-2 border-gray-300 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={completionLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={validationLoading || !validationInput.trim()}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {validationLoading ? 'Generating...' : 'Complete'}
                    </button>
                </form>

                {validationData && (
                    <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                        <div className="font-medium text-green-800 mb-2">Validation Result:</div>
                        <div className="whitespace-pre-wrap text-green-700">
                            {typeof validationData.message === 'string' ? validationData.message : JSON.stringify(validationData.message)}
                        </div>
                        {/* Usage information is not available for validationData */}
                    </div>
                )}

                {validationError && (
                    <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
                        Error: {validationError}
                    </div>
                )}
            </div>
        </div>
    );
}
