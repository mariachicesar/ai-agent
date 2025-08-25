/**
 * ErrorDisplay Component
 * 
 * Displays error messages with consistent styling
 */

interface ErrorDisplayProps {
    error: string;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
    return (
        <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
            Error: {error}
        </div>
    );
}
