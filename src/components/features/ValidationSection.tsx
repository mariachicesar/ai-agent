/**
 * ValidationSection Component
 * 
 * Output validation functionality for structured data
 */

import { useState, FormEvent, useEffect } from 'react';
import { useSWRValidation } from '@/hooks/useSWROpenAI';
import SectionCard from '../ui/SectionCard';
import TextAreaForm from '../ui/TextAreaForm';
import ResponseDisplay from '../ui/ResponseDisplay';
import ErrorDisplay from '../ui/ErrorDisplay';

export default function ValidationSection() {
    const [validationInput, setValidationInput] = useState('');

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

    const handleCompletionValidation = async (e: FormEvent) => {
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
        <SectionCard title="Output Validation for Calendar Events only ">
            <TextAreaForm
                value={validationInput}
                onChange={setValidationInput}
                onSubmit={handleCompletionValidation}
                isLoading={validationLoading}
                placeholder="Enter a prompt for validation..."
                buttonText="Validate"
                loadingText="Validating..."
                buttonColor="blue"
            />

            {validationData && (
                <ResponseDisplay
                    data={validationData}
                    title="Validation Result"
                    colorScheme="blue"
                />
            )}

            {validationError && <ErrorDisplay error={validationError} />}
        </SectionCard>
    );
}
