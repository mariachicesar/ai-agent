/**
 * MessageBubble Component
 * 
 * Displays individual chat messages with role-based styling
 */

interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

interface MessageBubbleProps {
    message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const getRoleStyles = (role: string) => {
        switch (role) {
            case 'user':
                return 'bg-blue-100 ml-12';
            case 'assistant':
                return 'bg-gray-100 mr-12';
            default:
                return 'bg-yellow-100';
        }
    };

    return (
        <div className={`p-3 rounded-lg ${getRoleStyles(message.role)}`}>
            <div className="font-medium text-sm text-gray-600 mb-1">
                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
    );
}
