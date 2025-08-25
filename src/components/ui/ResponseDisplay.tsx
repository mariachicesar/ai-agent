/**
 * ResponseDisplay Component
 * 
 * Displays API responses with optional usage information
 */

interface ResponseData {
    message: string;
    usage?: {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
    };
}

interface ResponseDisplayProps {
    data: ResponseData;
    title: string;
    colorScheme?: 'green' | 'blue' | 'purple';
}

export default function ResponseDisplay({
    data,
    title,
    colorScheme = 'green'
}: ResponseDisplayProps) {
    const getColorClasses = () => {
        switch (colorScheme) {
            case 'blue':
                return {
                    bg: 'bg-blue-50 border-blue-300',
                    titleText: 'text-blue-800',
                    bodyText: 'text-blue-700',
                    usageText: 'text-blue-600'
                };
            case 'purple':
                return {
                    bg: 'bg-purple-50 border-purple-300',
                    titleText: 'text-purple-800',
                    bodyText: 'text-purple-700',
                    usageText: 'text-purple-600'
                };
            default:
                return {
                    bg: 'bg-green-50 border-green-300',
                    titleText: 'text-green-800',
                    bodyText: 'text-green-700',
                    usageText: 'text-green-600'
                };
        }
    };

    const colors = getColorClasses();

    return (
        <div className={`mt-6 p-4 ${colors.bg} border-2 rounded-lg`}>
            <div className={`font-medium ${colors.titleText} mb-2`}>{title}:</div>
            <div className={`whitespace-pre-wrap ${colors.bodyText}`}>
                {typeof data.message === 'string' ? data.message : JSON.stringify(data.message)}
            </div>
            {data.usage && (
                <div className={`mt-2 text-sm ${colors.usageText}`}>
                    Tokens used: {data.usage.total_tokens}
                    (prompt: {data.usage.prompt_tokens},
                    completion: {data.usage.completion_tokens})
                </div>
            )}
        </div>
    );
}
