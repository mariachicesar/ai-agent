/**
 * RawDataDisplay Component
 * 
 * Displays raw API response data for debugging and transparency
 */

interface DebugStep {
    step: number;
    description: string;
    data: unknown;
}

interface ResponseWithDebug {
    message: unknown;
    debug?: {
        steps: DebugStep[];
    };
    [key: string]: unknown;
}

interface RawDataDisplayProps {
    data: ResponseWithDebug | unknown;
    title?: string;
    colorScheme?: 'green' | 'blue' | 'purple' | 'gray';
    isLoading?: boolean;
}

export default function RawDataDisplay({
    data,
    title = "Raw API Response",
    colorScheme = 'gray',
    isLoading = false
}: RawDataDisplayProps) {
    const getColorClasses = () => {
        switch (colorScheme) {
            case 'blue':
                return {
                    bg: 'bg-blue-50 border-blue-200',
                    titleText: 'text-blue-900',
                    codeText: 'text-blue-800',
                    stepBg: 'bg-blue-100',
                    stepText: 'text-blue-800'
                };
            case 'purple':
                return {
                    bg: 'bg-purple-50 border-purple-200',
                    titleText: 'text-purple-900',
                    codeText: 'text-purple-800',
                    stepBg: 'bg-purple-100',
                    stepText: 'text-purple-800'
                };
            case 'green':
                return {
                    bg: 'bg-green-50 border-green-200',
                    titleText: 'text-green-900',
                    codeText: 'text-green-800',
                    stepBg: 'bg-green-100',
                    stepText: 'text-green-800'
                };
            default:
                return {
                    bg: 'bg-gray-50 border-gray-200',
                    titleText: 'text-gray-900',
                    codeText: 'text-gray-800',
                    stepBg: 'bg-gray-100',
                    stepText: 'text-gray-800'
                };
        }
    };

    const colors = getColorClasses();

    if (!data && !isLoading) return null;

    // Check if data has debug information
    const hasDebugInfo = data && typeof data === 'object' && data !== null && 'debug' in data;
    const responseData = data as ResponseWithDebug;

    return (
        <div className={`mt-4 p-3 ${colors.bg} border rounded-lg`}>
            <details className="cursor-pointer">
                <summary className={`font-medium ${colors.titleText} text-sm mb-2 hover:underline`}>
                    🔍 {title} {isLoading && '(Loading...)'}
                </summary>
                <div className="mt-2 space-y-3">
                    {isLoading ? (
                        <div className="text-sm text-gray-500 italic">Loading raw data...</div>
                    ) : hasDebugInfo && responseData.debug?.steps ? (
                        <div>
                            <div className="text-xs font-semibold text-gray-600 mb-2">AI Processing Steps:</div>
                            {responseData.debug.steps.map((step) => (
                                <details key={step.step} className="mb-2">
                                    <summary className={`text-xs font-medium ${colors.stepText} ${colors.stepBg} p-2 rounded cursor-pointer`}>
                                        Step {step.step}: {step.description}
                                    </summary>
                                    <pre className={`text-xs ${colors.codeText} overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded border mt-1 ml-2`}>
                                        {JSON.stringify(step.data, null, 2)}
                                    </pre>
                                </details>
                            ))}
                            <details className="mt-3">
                                <summary className="text-xs font-medium text-gray-600 cursor-pointer">
                                    📄 Complete Raw Response
                                </summary>
                                <pre className={`text-xs ${colors.codeText} overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded border mt-1`}>
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <pre className={`text-xs ${colors.codeText} overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded border`}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    )}
                </div>
            </details>
        </div>
    );
}
