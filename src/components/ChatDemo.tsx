/**
 * ChatDemo Component - Refactored into smaller components
 * 
 * This is the main demo page that showcases different OpenAI features:
 * - Chat conversation
 * - One-off completion
 * - Output validation
 * - Tool calling
 */

'use client';

import ChatSection from './features/ChatSection';
import CompletionSection from './features/CompletionSection';
import ValidationSection from './features/ValidationSection';
import ToolCallingSection from './features/ToolCallingSection';
import KBToolSection from './features/KBToolSection';

export default function ChatDemo() {
    return (
        <div className="max-w-4xl mx-auto p-6 text-black space-y-8">
            <h1 className="text-3xl font-bold text-center">OpenAI + SWR + Next.js Demo</h1>

            {/* Chat Section */}
            <ChatSection />

            {/* Completion Section */}
            <CompletionSection />

            {/* Validation Section */}
            <ValidationSection />

            {/* Tool Calling Section */}
            <ToolCallingSection />

            {/* Tool Calling Knowledge Base */}
            <KBToolSection />
        </div>
    );
}
