/**
 * Knowledge Base Tool Section Component
 * 
 * Tool calling functionality for external API integration
 */

import { useState, FormEvent } from 'react';
import { useSWRKBTool } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import TextAreaForm from '../ui/TextAreaForm';
import ResponseDisplay from '../ui/ResponseDisplay';
import ErrorDisplay from '../ui/ErrorDisplay';

export default function KnowledgeBaseToolSection() {
    const [input, setInput] = useState('');

    const {
        callKBTool,
        isLoading: toolLoading,
        error: toolError,
        data: toolData
    } = useSWRKBTool({
        model: 'gpt-3.5-turbo'
    });

    const handleToolCalling = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            await callKBTool(input);
            setInput('');
        } catch (err) {
            console.error('Failed to call tool:', err);
        }
    };

    return (
        <SectionCard title="Knowledge Base Tool Section: First checks question to try to match to our json mock data before calling the tool and LLM">
            <TextAreaForm
                value={input}
                onChange={setInput}
                onSubmit={handleToolCalling}
                isLoading={toolLoading}
                placeholder="Ask about return policy it will look at our mock data for knowledge base response"
                buttonText="Call KB Tool"
                loadingText="Processing..."
                buttonColor="purple"
            />

            {toolData && (
                <ResponseDisplay
                    data={toolData}
                    title="Knowledge Base Tool Result"
                    colorScheme="purple"
                />
            )}

            {toolError && <ErrorDisplay error={toolError} />}
        </SectionCard>
    );
}
