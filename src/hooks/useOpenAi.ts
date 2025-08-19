import { useState, useCallback } from "react";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface UseOpenAIOptions {
  model?: string;
}

export function useOpenAI(options: UseOpenAIOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const newMessages: Message[] = [
          ...messages,
          { role: "user", content: userMessage },
        ];

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: newMessages,
            model: options.model || "gpt-3.5-turbo",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const result: ChatResponse = await response.json();

        const updatedMessages = [
          ...newMessages,
          { role: "assistant", content: result.message },
        ] as Message[];

        setMessages(updatedMessages);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options.model]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
  };
}

// Alternative hook for one-off completions
export function useOpenAICompletion(options: UseOpenAIOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCallback(
    async (prompt: string, systemMessage?: string): Promise<ChatResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const messages: Message[] = [];

        if (systemMessage) {
          messages.push({ role: "system", content: systemMessage });
        }

        messages.push({ role: "user", content: prompt });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            model: options.model || "gpt-3.5-turbo",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to complete request");
        }

        const result: ChatResponse = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options.model]
  );

  return {
    complete,
    isLoading,
    error,
  };
}
