/**
 * CompletionSection Component
 * 
 * One-off text completion functionality
 */

import { useState, FormEvent } from 'react';
import { useSWRCompletion } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import TextAreaForm from '../ui/TextAreaForm';
import ResponseDisplay from '../ui/ResponseDisplay';
import ErrorDisplay from '../ui/ErrorDisplay';
import RawDataDisplay from '../ui/RawDataDisplay';

export default function CompletionSection() {
    const [completionInput, setCompletionInput] = useState('');

    const {
        complete,
        isLoading: completionLoading,
        error: completionError,
        data: completionData
    } = useSWRCompletion({
        model: 'gpt-3.5-turbo'
    });

    const handleCompletion = async (e: FormEvent) => {
        e.preventDefault();
        if (!completionInput.trim()) return;

        try {
            await complete(completionInput);
            setCompletionInput('');
        } catch (err) {
            console.error('Failed to get completion:', err);
        }
    };

    return (
        <SectionCard title="One-off Completion">
            <TextAreaForm
                value={completionInput}
                onChange={setCompletionInput}
                onSubmit={handleCompletion}
                isLoading={completionLoading}
                placeholder="Enter a prompt for completion..."
                buttonText="Complete"
                loadingText="Generating..."
                buttonColor="green"
            />

            {completionData && (
                <>
                    <ResponseDisplay
                        data={completionData}
                        title="Completion Result"
                        colorScheme="green"
                    />
                    <RawDataDisplay
                        data={completionData}
                        title="Raw Completion API Response"
                        colorScheme="green"
                    />
                </>
            )}

            {completionError && <ErrorDisplay error={completionError} />}
        </SectionCard>
    );
}
