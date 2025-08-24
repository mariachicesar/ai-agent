import useSWRMutation from "swr/mutation";
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

interface UseSWROpenAIOptions {
  model?: string;
}

export function useSWROpenAI(options: UseSWROpenAIOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);

  const {
    trigger,
    data,
    error,
    isMutating: isLoading,
    reset,
  } = useSWRMutation("/api/chat", sendChatRequest);

  const sendMessage = useCallback(
    async (userMessage: string, systemMessage?: string) => {
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
          model: options.model || "gpt-3.5-turbo",
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
    [messages, trigger, options.model]
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
  };
}

// Hook for one-off completions using SWR
export function useSWRCompletion(options: UseSWROpenAIOptions = {}) {
  const {
    trigger,
    data,
    error,
    isMutating: isLoading,
    reset,
  } = useSWRMutation("/api/chat", sendChatRequest);

  const complete = useCallback(
    async (
      prompt: string,
      systemMessage?: string
    ): Promise<ChatResponse | undefined> => {
      const messages: Message[] = [];

      if (systemMessage) {
        messages.push({ role: "system", content: systemMessage });
      }

      messages.push({ role: "user", content: prompt });

      return trigger({
        messages,
        model: options.model || "gpt-3.5-turbo",
      });
    },
    [trigger, options.model]
  );

  return {
    complete,
    isLoading,
    error: error?.message || null,
    data,
    reset,
  };
}

// Step #2: Hook for validation output using SWR
export function useSWRValidation(options: UseSWROpenAIOptions = {}) {
  const {
    trigger,
    data,
    error,
    isMutating: isLoading,
    reset,
  } = useSWRMutation("/api/outputValidation", sendChatRequest);

  const validateOutput = useCallback(
    async (prompt: string): Promise<ChatResponse | undefined> => {
      return trigger({
        message: prompt,
        model: options.model || "gpt-3.5-turbo",
      });
    },
    [trigger, options.model]
  );

  return {
    validateOutput,
    isLoading,
    error: error?.message || null,
    data,
    reset,
  };
}
