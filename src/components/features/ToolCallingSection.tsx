/**
 * ToolCallingSection Component
 * 
 * Tool calling functionality for external API integration
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
        <SectionCard title="Tool Calling only for Weather + Structure output: OpenAi (LLM) Determines if we must use Weather API">
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
