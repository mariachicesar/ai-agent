import { useCallback, useState } from "react";
import useSWRMutation from "swr/mutation";

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
    promptChaining: "/api/promptChaining",
    routing: "/api/routing",
    parallelization: "/api/parallelization",
    // Keep default fallback
    default: "/api/agent",
  };

  return routeMap[workflow] || "/api/agent"; // default fallback
};

export function useAgentPromptChain() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<string>("chat");

  // Remove the fixed URL and use a dynamic key
  const {
    trigger,
    data,
    error,
    isMutating: isLoading,
    reset,
  } = useSWRMutation(
    currentWorkflow,
    (key, { arg }: { arg: ChatRequest | ValidationRequest }) =>
      sendChatRequest(getApiRoute(key), { arg })
  );

  const sendMessage = useCallback(
    async (userMessage: string, workflow: string, systemMessage?: string) => {
      // Update current workflow first
      setCurrentWorkflow(workflow);

      // [] empty array where we push to keep track of messages
      const newMessages: Message[] = [...messages];

      // Add system message if provided and it's the first message
      if (systemMessage && messages.length === 0) {
        newMessages.push({ role: "system", content: systemMessage });
      }

      // Add user message
      newMessages.push({ role: "user", content: userMessage });

      try {
        const response = await trigger({
          messages: newMessages,
          model: "gpt-3.5-turbo",
        });

        if (response) {
          // Add assistant response to messages
          const updatedMessages: Message[] = [
            ...newMessages,
            { role: "assistant", content: response.message },
          ];
          setMessages(updatedMessages);
          return response;
        }
      } catch (err) {
        // Error is already handled by SWR
        throw err;
      }
    },
    [messages, trigger]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    reset();
  }, [reset]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error: error?.message || null,
    data,
    reset,
    currentWorkflow,
  };
}
