/**
 * Knowledge Base Tool Section Component
 * 
 * Demonstrates intelligent knowledge base integration where the AI automatically 
 * determines when to search internal knowledge repositories based on user queries.
 * The LLM analyzes questions, conditionally retrieves relevant information from 
 * mock database content, and generates natural, contextual responses using the 
 * retrieved knowledge.
 */

import { useState, FormEvent } from 'react';
import { useSWRKBTool } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import TextAreaForm from '../ui/TextAreaForm';
import ResponseDisplay from '../ui/ResponseDisplay';
import ErrorDisplay from '../ui/ErrorDisplay';
import RawDataDisplay from '../ui/RawDataDisplay';

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
        <SectionCard title="Intelligent Knowledge Base Search - AI-Powered Information Retrieval">
            <TextAreaForm
                value={input}
                onChange={setInput}
                onSubmit={handleToolCalling}
                isLoading={toolLoading}
                placeholder="Ask questions about company policies or procedures (e.g., 'What is the return policy?'). The AI will search our knowledge base and provide relevant information."
                buttonText="Call KB Tool"
                loadingText="Processing..."
                buttonColor="purple"
            />

            {toolData && (
                <>
                    <ResponseDisplay
                        data={toolData}
                        title="Knowledge Base Tool Result"
                        colorScheme="purple"
                    />
                    <RawDataDisplay
                        data={toolData}
                        title="Raw KB Tool API Response"
                        colorScheme="purple"
                    />
                </>
            )}

            {toolError && <ErrorDisplay error={toolError} />}
        </SectionCard>
    );
}
