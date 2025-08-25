/**
 * MessageList Component
 * 
 * Displays a list of chat messages with scrollable container
 */

import MessageBubble from './MessageBubble';

interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

interface MessageListProps {
    messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
    return (
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
                <p className="text-gray-500 text-center">Start a conversation below...</p>
            ) : (
                messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                ))
            )}
        </div>
    );
}
