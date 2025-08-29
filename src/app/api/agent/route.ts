import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.js";
import z from "zod";

/*
 * This API route implements a prompt chaining workflow for processing calendar events.
 * It uses OpenAI's GPT model to sequentially:
 * 1. Determine if a message contains calendar event information.
 * 2. Extract detailed event information if the confidence score is sufficient.
 * 3. Generate a confirmation message and calendar link for the event.
 *
 * The process is designed to strategically use AI at the right steps to ensure accurate results.
 * Tools are defined for each step, and the workflow is executed in a loop with retries to handle tool calls.
 * Break down the process and Engineer it in such a way that i can strategically use Ai in the right moment 
 * in the right order, in order to solve it.

 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//Define the data models
const ExtractEvent = z.object({
  description: z.string(),
  isCalendarEvent: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
});

const EventDetails = z.object({
  name: z.string(),
  date: z.string(),
  duration: z.string(),
  participants: z.array(z.string()),
});

const EventConfirmation = z.object({
  message: z.string(),
  link: z.string(),
});

//Define the functions
const extractEventInfo = async (message: string) => {
  const localDate = new Date();
  const response = await openai.responses.parse({
    model: "gpt-4o-2024-08-06",
    input: [
      {
        role: "system",
        content: `${localDate.toISOString()} You are a helpful assistant determine if the input is a calendar event information and give a confidence score for the extraction.`,
      },
      { role: "user", content: message },
    ],
    text: {
      format: zodTextFormat(ExtractEvent, "extracted_event"),
    },
  });
  console.log(response, "extractEventInfo");
  return response;
};

const extractEventDetails = async (message: string) => {
  const response = await openai.responses.parse({
    model: "gpt-4o-2024-08-06",
    input: [
      {
        role: "system",
        content:
          "You are a helpful assistant that extracts detailed calendar event information from the user's message.",
      },
      { role: "user", content: message },
    ],
    text: {
      format: zodTextFormat(EventDetails, "event_details"),
    },
  });
  console.log(response, "extractEventDetails");
  return response;
};

const extractEventConfirmation = async (
  eventDetails: z.infer<typeof EventDetails>
) => {
  const response = await openai.responses.parse({
    model: "gpt-4o-2024-08-06",
    input: [
      {
        role: "system",
        content:
          "You are a helpful assistant that confirms calendar event details. Generate a Google Calendar if applicable.",
      },
      {
        role: "user",
        content: `Here are the event details: ${JSON.stringify(eventDetails)}`,
      },
    ],
    text: {
      format: zodTextFormat(EventConfirmation, "event_confirmation"),
    },
  });
  return response;
};

// Define tools for OpenAI function calling
const tools = [
  {
    type: "function" as const,
    function: {
      name: "extractEventInfo",
      description:
        "Extract and validate if a message contains calendar event information",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "The user's message to analyze for calendar event information",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extractEventDetails",
      description:
        "Extract detailed calendar event information from a confirmed calendar message",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The user's message containing calendar event details",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extractEventConfirmation",
      description:
        "Generate confirmation message and calendar link for event details",
      parameters: {
        type: "object",
        properties: {
          eventDetails: {
            type: "object",
            description: "The extracted event details object",
          },
        },
        required: ["eventDetails"],
      },
    },
  },
];

// Function call executor
async function executeFunction(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "extractEventInfo":
      return await extractEventInfo(args.message as string);
    case "extractEventDetails":
      return await extractEventDetails(args.message as string);
    case "extractEventConfirmation": {
      console.log("args:", args);
      // Ensure eventDetails is passed correctly
      const eventDetails = args.eventDetails as z.infer<typeof EventDetails>;
      if (!eventDetails) {
        throw new Error(
          "Missing eventDetails argument for extractEventConfirmation"
        );
      }
      return await extractEventConfirmation(eventDetails);
    }
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

export async function POST(request: Request) {
  const { messages, model = "gpt-4o-2024-08-06" } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "Messages array is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const localDate = new Date();
    // System prompt to guide the agent's behavior
    const systemPrompt = `You are a calendar event processing agent. Your job is to:
    1. First, determine if a message contains calendar event information using extractEventInfo. Today's date is ${localDate.toLocaleDateString()}.
    2. If it's a calendar event (confidence > 0.7), extract detailed event information using extractEventDetails
    3. Finally, generate a confirmation message and calendar link using extractEventConfirmation
    
    Always follow this sequential process and chain the functions together.`;

    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Step 1: Make initial OpenAI call with tools available
    let completion = await openai.chat.completions.create({
      model: model,
      messages: conversationMessages,
      tools: tools,
      tool_choice: "auto", // Let OpenAI decide when to use tools
    });

    // Process tool calls with retry limit to prevent infinite loops
    const maxRetries = 5;
    let retryCount = 0;
    let extractedEventDetails: z.infer<typeof EventDetails> | null = null;
    let eventInfoResult: z.infer<typeof ExtractEvent> | null = null;

    while (
      completion.choices[0]?.message?.tool_calls &&
      retryCount < maxRetries
    ) {
      console.log(`Tool call iteration: ${retryCount + 1}/${maxRetries}`);

      const message = completion.choices[0].message;

      // Add the assistant's message with tool calls to conversation
      conversationMessages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });

      // Execute each tool call - we know tool_calls exists from while condition
      const toolCalls = message.tool_calls!;
      for (const toolCall of toolCalls) {
        if (toolCall.type === "function") {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`Executing function: ${functionName}`, functionArgs);

            // Handle extractEventConfirmation specially - use extracted details from previous call
            if (
              functionName === "extractEventConfirmation" &&
              extractedEventDetails
            ) {
              functionArgs.eventDetails = extractedEventDetails;
            }

            // Execute the function
            const result = await executeFunction(functionName, functionArgs);

            // Store event info result and check confidence score
            if (functionName === "extractEventInfo") {
              try {
                eventInfoResult = JSON.parse(result.output_text);
                console.log("Event info result:", eventInfoResult);

                // Check confidence score before proceeding
                if (eventInfoResult && eventInfoResult.confidenceScore < 0.7) {
                  console.log(
                    `Low confidence score: ${eventInfoResult.confidenceScore}. Skipping further processing.`
                  );
                  // Add a message indicating low confidence
                  conversationMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({
                      ...result,
                      note: `Confidence score ${eventInfoResult.confidenceScore} is below threshold (0.7). Not proceeding with event extraction.`,
                    }),
                  });
                  continue;
                }
              } catch (parseError) {
                console.error("Failed to parse event info result:", parseError);
              }
            }

            // Store event details for the next function call
            if (functionName === "extractEventDetails") {
              try {
                extractedEventDetails = JSON.parse(result.output_text);
                console.log(
                  "Stored event details for next function:",
                  extractedEventDetails
                );
              } catch (parseError) {
                console.error("Failed to parse event details:", parseError);
              }
            }

            // Add the tool result to conversation
            conversationMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            console.error(`Function execution failed:`, error);
            conversationMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            });
          }
        }
      }

      retryCount++;

      // Break if we've reached max retries
      if (retryCount >= maxRetries) {
        console.log(
          `Reached maximum retry limit (${maxRetries}), breaking tool call chain`
        );
        break;
      }

      // Make another OpenAI call to continue the chain or get final response
      completion = await openai.chat.completions.create({
        model: model,
        messages: conversationMessages,
        tools: tools,
        tool_choice: "auto",
      });
    }

    // Return the final response
    const finalMessage =
      completion.choices[0]?.message?.content || "No response generated";

    return new Response(
      JSON.stringify({
        message: finalMessage,
        confidenceScore: eventInfoResult?.confidenceScore || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Agent error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process agent request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
