/**
 * TextAreaForm Component
 * 
 * Reusable form component with textarea input for various AI operations
 */

import { FormEvent } from 'react';

interface TextAreaFormProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    isLoading: boolean;
    placeholder: string;
    buttonText: string;
    loadingText: string;
    buttonColor?: 'green' | 'blue' | 'purple';
}

export default function TextAreaForm({
    value,
    onChange,
    onSubmit,
    isLoading,
    placeholder,
    buttonText,
    loadingText,
    buttonColor = 'green'
}: TextAreaFormProps) {
    const getButtonColorClasses = () => {
        switch (buttonColor) {
            case 'blue':
                return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 focus:border-blue-500';
            case 'purple':
                return 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500 focus:border-purple-500';
            default:
                return 'bg-green-500 hover:bg-green-600 focus:ring-green-500 focus:border-green-500';
        }
    };

    const getFocusColorClasses = () => {
        switch (buttonColor) {
            case 'blue':
                return 'focus:ring-blue-500 focus:border-blue-500';
            case 'purple':
                return 'focus:ring-purple-500 focus:border-purple-500';
            default:
                return 'focus:ring-green-500 focus:border-green-500';
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full p-3 border-2 border-gray-300 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 ${getFocusColorClasses()}`}
                    disabled={isLoading}
                />
            </div>
            <button
                type="submit"
                disabled={isLoading || !value.trim()}
                className={`px-6 py-3 ${getButtonColorClasses()} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isLoading ? loadingText : buttonText}
            </button>
        </form>
    );
}
