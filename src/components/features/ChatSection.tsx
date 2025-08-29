/**
 * ChatSection Component
 * 
 * Complete chat functionality with message history
 */

import { useState, FormEvent } from 'react';
import { useSWROpenAI } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import MessageList from '../ui/MessageList';
import ChatInput from '../ui/ChatInput';
import ErrorDisplay from '../ui/ErrorDisplay';
import RawDataDisplay from '../ui/RawDataDisplay';

export default function ChatSection() {
    const [input, setInput] = useState('');

    const { messages, sendMessage, clearMessages, isLoading, error, data } = useSWROpenAI({
        model: 'gpt-3.5-turbo'
    });

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            await sendMessage(input);
            setInput('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    return (
        <SectionCard title="Chat Conversation">
            <MessageList messages={messages} />

            <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSendMessage}
                onClear={clearMessages}
                isLoading={isLoading}
                placeholder="Type your message..."
            />

            {error && <ErrorDisplay error={error} />}

            {/* Display raw data from the last API call */}
            {data && (
                <RawDataDisplay
                    data={data}
                    title="Raw Chat API Response (Last Message)"
                    colorScheme="gray"
                />
            )}

            {/* Display all messages in raw format */}
            {messages.length > 0 && (
                <RawDataDisplay
                    data={messages}
                    title="Raw Messages Array"
                    colorScheme="gray"
                />
            )}
        </SectionCard>
    );
}
