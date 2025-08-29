/**
 * ToolCallingSection Component
 * 
 * Demonstrates intelligent tool calling where the AI automatically determines 
 * when to invoke external APIs based on user input. The LLM analyzes the query 
 * and conditionally calls weather APIs when location-based weather information 
 * is requested, then returns structured, formatted responses.
 */

import { useState, FormEvent } from 'react';
import { useSWRTool } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import TextAreaForm from '../ui/TextAreaForm';
import ResponseDisplay from '../ui/ResponseDisplay';
import ErrorDisplay from '../ui/ErrorDisplay';
import RawDataDisplay from '../ui/RawDataDisplay';

export default function ToolCallingSection() {
    const [toolInput, setToolInput] = useState('');

    const {
        callTool,
        isLoading: toolLoading,
        error: toolError,
        data: toolData
    } = useSWRTool({
        model: 'gpt-3.5-turbo'
    });

    const handleToolCalling = async (e: FormEvent) => {
        e.preventDefault();
        if (!toolInput.trim()) return;

        try {
            await callTool(toolInput);
            setToolInput('');
        } catch (err) {
            console.error('Failed to call tool:', err);
        }
    };

    return (
        <SectionCard title="Intelligent Tool Calling - Weather API Integration with Structured Output">
            <TextAreaForm
                value={toolInput}
                onChange={setToolInput}
                onSubmit={handleToolCalling}
                isLoading={toolLoading}
                placeholder="Ask about the weather in any city (e.g., 'What's the weather in Paris?')..."
                buttonText="Call Tool"
                loadingText="Processing..."
                buttonColor="purple"
            />

            {toolData && (
                <>
                    <ResponseDisplay
                        data={toolData}
                        title="Tool Result"
                        colorScheme="purple"
                    />
                    <RawDataDisplay
                        data={toolData}
                        title="Raw Tool API Response"
                        colorScheme="purple"
                    />
                </>
            )}

            {toolError && <ErrorDisplay error={toolError} />}
        </SectionCard>
    );
}
