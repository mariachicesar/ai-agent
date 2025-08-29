import { useCallback, useState } from "react";

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
  confidenceScore?: number;
  calendarLink?: string;
}

interface ChatRequest {
  messages: Message[];
  model?: string;
}

interface ValidationRequest {
  message: string;
  model?: string;
}

// Fetcher function for useSWRMutation
async function sendChatRequest(
  url: string,
  { arg }: { arg: ChatRequest | ValidationRequest }
): Promise<ChatResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }

  return response.json();
}

// Add workflow to API route mapping
const getApiRoute = (workflow: string): string => {
  const routeMap: Record<string, string> = {
    promptChaining: "/api/prompt-chaining",
    routing: "/api/routing",
    parallelization: "/api/parallelization",
    // Keep default fallback
    default: "/api/chat",
  };

  return routeMap[workflow] || "/api/chat"; // default fallback
};

export function useAgentPromptChain() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChatResponse | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string, workflow: string, systemMessage?: string) => {
      // Update current workflow for tracking
      setCurrentWorkflow(workflow);
      setIsLoading(true);
      setError(null);

      // [] empty array where we push to keep track of messages
      const newMessages: Message[] = [...messages];

      // Add system message if provided and it's the first message
      if (systemMessage && messages.length === 0) {
        newMessages.push({ role: "system", content: systemMessage });
      }

      // Add user message
      newMessages.push({ role: "user", content: userMessage });

      try {
        // Make the request directly to the correct endpoint based on workflow
        const response = await sendChatRequest(getApiRoute(workflow), {
          arg: {
            messages: newMessages,
            model: "gpt-3.5-turbo",
          },
        });

        if (response) {
          // Add assistant response to messages
          const updatedMessages: Message[] = [
            ...newMessages,
            { role: "assistant", content: response.message },
          ];
          setMessages(updatedMessages);
          setData(response);
          return response;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setData(null);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    data,
    reset,
    currentWorkflow,
  };
}
