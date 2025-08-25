/**
 * ChatInput Component
 * 
 * Input form for sending chat messages with loading states
 */

import { FormEvent } from 'react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    onClear: () => void;
    isLoading: boolean;
    placeholder?: string;
}

export default function ChatInput({
    value,
    onChange,
    onSubmit,
    onClear,
    isLoading,
    placeholder = "Type your message..."
}: ChatInputProps) {
    return (
        <form onSubmit={onSubmit} className="flex gap-2">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !value.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Sending...' : 'Send'}
            </button>
            <button
                type="button"
                onClick={onClear}
                disabled={isLoading}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
                Clear
            </button>
        </form>
    );
}
