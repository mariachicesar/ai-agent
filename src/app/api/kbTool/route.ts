/**
 * Knowledge Base Tool API Route
 *
 * This API endpoint demonstrates how to implement a knowledge base tool using OpenAI's
 * function calling feature. The tool searches a local JSON knowledge base and returns
 * relevant answers to user questions.
 *
 * Key Features:
 * - OpenAI Function Calling integration
 * - Intelligent question matching (exact, partial, keyword-based)
 * - Error handling and validation
 * - Structured response format
 *
 * How it works:
 * 1. User asks a question
 * 2. OpenAI decides if it needs to search the knowledge base
 * 3. Our search function finds the best matching answer
 * 4. OpenAI generates a natural response based on the found information
 */

import OpenAI from "openai";
import path from "path";
import fs from "fs";
import z from "zod";

// Initialize OpenAI client with API key from environment variables
// Make sure to set OPENAI_API_KEY in your .env.local file
const open = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Knowledge Base File Reader
 *
 * Reads and parses the knowledge base JSON file from the file system.
 * The knowledge base contains structured Q&A pairs that our tool can search.
 *
 * Expected JSON format:
 * {
 *   "records": [
 *     {
 *       "id": 1,
 *       "question": "What is the return policy?",
 *       "answer": "You can return items within 30 days..."
 *     }
 *   ]
 * }
 *
 * @returns {Object|null} Parsed knowledge base data or null if error
 */
function search_kb() {
  // Construct the absolute path to the knowledge base file
  const kbPath = path.join(process.cwd(), "src/app/api/kbTool/kb.json");
  try {
    // Read the file synchronously and parse JSON
    const data = fs.readFileSync(kbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Log error and return null if file reading fails
    console.error("Error reading kb.json:", error);
    return null;
  }
}

/**
 * Intelligent Question Matching Algorithm
 *
 * Finds the best matching Q&A record from the knowledge base using multiple strategies:
 * 1. Exact Match: Direct comparison of normalized questions
 * 2. Partial Match: Substring matching (questions contain each other)
 * 3. Keyword Match: Word-by-word comparison for semantic similarity
 *
 * This multi-layered approach ensures we can match variations of questions like:
 * - "What payment methods do you accept?" → "What payment methods are accepted?"
 * - "Can I pay with credit card?" → "What payment methods are accepted?"
 *
 * @param {string} userQuestion - The question from the user
 * @param {Array} records - Array of knowledge base records
 * @returns {Object|null} Best matching record or null if no match found
 */
function findBestMatch(
  userQuestion: string,
  records: Array<{ id: number; question: string; answer: string }>
) {
  // Normalize the user's question for better matching
  const normalizedUserQuestion = userQuestion.toLowerCase().trim();

  // Strategy 1: Try exact match first (highest confidence)
  let bestMatch = records.find(
    (record) => record.question.toLowerCase().trim() === normalizedUserQuestion
  );

  if (bestMatch) {
    console.log("Found exact match for:", userQuestion);
    return bestMatch;
  }

  // Strategy 2: Look for partial matches (medium confidence)
  // This catches cases where the user question is a subset of KB question or vice versa
  bestMatch = records.find((record) => {
    const recordQuestion = record.question.toLowerCase();
    return (
      recordQuestion.includes(normalizedUserQuestion) ||
      normalizedUserQuestion.includes(recordQuestion)
    );
  });

  if (bestMatch) {
    console.log("Found partial match for:", userQuestion);
    return bestMatch;
  }

  // Strategy 3: Keyword-based matching (lower confidence)
  // Split questions into words and look for overlapping keywords
  const userKeywords = normalizedUserQuestion.split(/\s+/);
  for (const record of records) {
    const recordWords = record.question.toLowerCase().split(/\s+/);
    const matchingWords = userKeywords.filter((word) =>
      recordWords.some(
        (recordWord) => recordWord.includes(word) || word.includes(recordWord)
      )
    );

    // If we found at least one matching keyword, consider this a match
    if (matchingWords.length > 0) {
      console.log(
        "Found keyword match for:",
        userQuestion,
        "Keywords:",
        matchingWords
      );
      return record;
    }
  }

  // No matches found with any strategy
  console.log("No match found for:", userQuestion);
  return null;
}

/**
 * Function Call Handler
 *
 * This function is called by OpenAI when it decides to use our knowledge base tool.
 * It acts as a router for different function calls and executes the appropriate logic.
 *
 * Currently supports:
 * - "search_kb": Searches the knowledge base for answers to user questions
 *
 * @param {string} name - The name of the function to call
 * @param {Object} args - Arguments passed by OpenAI (contains the user's question)
 * @returns {Object} Structured response with answer and source ID
 */
async function call_function(name: string, args: { question: string }) {
  if (name === "search_kb") {
    console.log("Searching knowledge base for:", args.question);

    // Load the knowledge base data
    const kbData = search_kb();
    if (!kbData || !kbData.records) {
      throw new Error("Knowledge base not found or invalid format");
    }

    // Find the best matching answer using our intelligent matching algorithm
    const bestMatch = findBestMatch(args.question, kbData.records);
    if (!bestMatch) {
      throw new Error(
        "No answer found in knowledge base for the given question"
      );
    }
    console.log("Source id:", bestMatch.id);
    // Return structured response that will be validated by Zod schema
    return {
      answer: bestMatch.answer,
      source: bestMatch.id, // Include source ID for traceability
    };
  }

  // If we get here, an unknown function was called
  throw new Error(`Unknown function: ${name}`);
}

/**
 * OpenAI Function/Tool Definition
 *
 * This defines the tools that OpenAI can call during the conversation.
 * The AI model uses this definition to understand:
 * - When to call the function (based on description)
 * - What parameters to pass (based on parameters schema)
 * - How to structure the function call
 *
 * Key components:
 * - name: Function identifier that matches our call_function handler
 * - description: Tells OpenAI when this tool should be used
 * - parameters: JSON Schema defining the expected input format
 */
const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_kb", // Must match the function name in call_function
      description:
        "Search our knowledge base to find answers to user questions about our products, services, policies, and support topics. Use this when users ask specific questions that might have documented answers.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description:
              "The user's question to search for in the knowledge base. Pass the exact question or a cleaned version of it.",
          },
        },
        required: ["question"], // OpenAI must provide this parameter
        additionalProperties: false, // Don't allow extra parameters
      },
    },
  },
];

/**
 * Main API Route Handler
 *
 * This is the entry point for the knowledge base tool API. It handles the complete
 * OpenAI function calling workflow:
 *
 * 1. Receives user messages from the frontend
 * 2. Makes initial OpenAI call with function calling enabled
 * 3. Processes any function calls that OpenAI makes
 * 4. Returns the final response to the user
 *
 * Expected request format:
 * {
 *   "messages": [{"role": "user", "content": "What is your return policy?"}],
 *   "model": "gpt-3.5-turbo" (optional)
 * }
 *
 * Response format:
 * {
 *   "message": "We have a 30-day return policy..."
 * }
 */
export async function POST(request: Request) {
  try {
    // Parse the incoming request body
    const { messages, model } = await request.json();

    // Validate that we received a proper messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Invalid request format. Expected messages array." },
        { status: 400 }
      );
    }

    // Extract the user's question from the messages array
    // We look for the last user message in case there's conversation history
    const userMessage = messages.filter((msg) => msg.role === "user").pop();
    if (!userMessage) {
      return Response.json(
        { error: "No user message found." },
        { status: 400 }
      );
    }

    console.log("Processing user question:", userMessage.content);

    // Define the system prompt that guides the AI's behavior
    // This tells the AI how to act and when to use the knowledge base
    const system_prompt =
      "You are a helpful assistant that answers user questions using our knowledge base. " +
      "When a user asks a question that might be answered by our documentation or policies, " +
      "search the knowledge base first. If you find relevant information, provide a helpful " +
      "response based on that information. If no relevant information is found, provide a " +
      "general helpful response.";

    // Prepare the conversation for OpenAI
    const chatMessages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: system_prompt },
      { role: "user", content: String(userMessage.content) },
    ];

    // Make the initial OpenAI API call with function calling enabled
    console.log("Making initial OpenAI call with tools enabled");
    const completion = await open.chat.completions.create({
      model: model || "gpt-3.5-turbo", // Use provided model or default
      messages: chatMessages,
      tools: tools, // Enable function calling with our knowledge base tool
    });

    // Check if OpenAI decided to call any functions
    // This happens when the AI determines that the user's question needs knowledge base lookup
    if (completion.choices[0].message.tool_calls) {
      console.log(
        "OpenAI made function calls:",
        completion.choices[0].message.tool_calls.length
      );
      const toolResults = [];
      const debugToolExecutions = [];

      // Process each function call that OpenAI made
      for (const toolCall of completion.choices[0].message.tool_calls) {
        // Only process function-type tool calls (not other types like code execution)
        if (toolCall.type !== "function") {
          continue;
        }

        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing function: ${name} with args:`, args);

        try {
          // Execute our function with the arguments OpenAI provided
          const result = await call_function(name, args);

          // Define the expected response format using Zod for validation
          const AnswerKB = z.object({
            answer: z.string(),
            source: z.number(),
          });

          // Validate that our function returned the expected format
          const validatedResult = AnswerKB.safeParse(result);
          if (!validatedResult.success) {
            throw new Error("Invalid response format from knowledge base");
          }

          console.log(
            "Function executed successfully, found answer from source:",
            validatedResult.data.source
          );

          // Store debug information
          debugToolExecutions.push({
            toolCallId: toolCall.id,
            functionName: name,
            arguments: args,
            result: result,
            validated: validatedResult.data,
            status: "success",
          });

          // Add the successful result to our tool results
          // This will be sent back to OpenAI so it can generate a natural language response
          toolResults.push({
            role: "tool" as const,
            tool_call_id: toolCall.id, // Must match the original tool call ID
            content: validatedResult.data.answer, // The actual answer from knowledge base
          });
        } catch (error) {
          // Handle errors gracefully - don't let function failures break the whole response
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          console.error("Function execution failed:", errorMessage);

          // Store debug information for errors too
          debugToolExecutions.push({
            toolCallId: toolCall.id,
            functionName: name,
            arguments: args,
            error: errorMessage,
            status: "error",
          });

          // Add error as tool result so OpenAI can handle it appropriately
          toolResults.push({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: `Error: ${errorMessage}`,
          });
        }
      }

      // Prepare the complete conversation including tool results
      // This gives OpenAI the full context to generate a helpful final response
      const updatedMessages = [
        ...chatMessages, // Original system and user messages
        completion.choices[0].message, // Assistant's message with tool calls
        ...toolResults, // Results from our function executions
      ];

      console.log("Making final OpenAI call with tool results");

      // Make a second OpenAI call to get the final natural language response
      // OpenAI will use the tool results to craft a helpful answer
      const finalCompletion = await open.chat.completions.create({
        model: model || "gpt-3.5-turbo",
        messages: updatedMessages,
      });

      // Return the final response in the format expected by the frontend
      return Response.json({
        message:
          finalCompletion.choices[0].message.content || "No response generated",
        debug: {
          steps: [
            {
              step: 1,
              description: "Initial OpenAI call with KB tool",
              data: {
                model: model || "gpt-3.5-turbo",
                userQuestion: userMessage.content,
                toolsAvailable: tools.length,
                response: completion,
              },
            },
            {
              step: 2,
              description: "Knowledge base search execution",
              data: {
                toolCallsCount:
                  completion.choices[0].message.tool_calls?.length || 0,
                toolCalls: completion.choices[0].message.tool_calls,
                executions: debugToolExecutions,
              },
            },
            {
              step: 3,
              description: "Final response generation",
              data: {
                model: model || "gpt-3.5-turbo",
                response: finalCompletion,
              },
            },
          ],
        },
      });
    }

    // If OpenAI didn't make any function calls, return its direct response
    // This happens when the AI decides it can answer without the knowledge base
    console.log("No function calls made, returning direct response");
    return Response.json({
      message: completion.choices[0].message.content || "No response generated",
      debug: {
        steps: [
          {
            step: 1,
            description: "Direct OpenAI response (no KB search needed)",
            data: {
              model: model || "gpt-3.5-turbo",
              userQuestion: userMessage.content,
              toolsAvailable: tools.length,
              toolCallsCount: 0,
              response: completion,
            },
          },
        ],
      },
    });
  } catch (error) {
    // Catch any unexpected errors and return them gracefully
    console.error("API route error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * LEARNING NOTES: How This Knowledge Base Tool Works
 *
 * This file demonstrates a complete implementation of OpenAI function calling
 * for knowledge base integration. Here's the step-by-step flow:
 *
 * 1. USER INTERACTION
 *    - User asks: "Can I pay with credit card?"
 *    - Frontend sends: {"messages": [{"role": "user", "content": "Can I pay with credit card?"}]}
 *
 * 2. INITIAL OPENAI CALL
 *    - We call OpenAI with the user's question and our tools definition
 *    - OpenAI analyzes the question and decides if it needs to search the knowledge base
 *    - If yes, it returns a tool_call instead of a direct answer
 *
 * 3. FUNCTION EXECUTION
 *    - We extract the function name ("search_kb") and arguments ({"question": "..."})
 *    - Our call_function() executes the knowledge base search
 *    - findBestMatch() uses intelligent matching to find relevant answers
 *    - We return the structured result: {"answer": "...", "source": 1}
 *
 * 4. FINAL OPENAI CALL
 *    - We send the tool results back to OpenAI
 *    - OpenAI crafts a natural language response based on the knowledge base answer
 *    - Example: "We accept credit cards, PayPal, and bank transfers."
 *
 * 5. RESPONSE TO USER
 *    - Frontend receives the final message and displays it to the user
 *
 * KEY BENEFITS:
 * - AI decides when to use the knowledge base (not every query needs it)
 * - Answers are grounded in your actual documentation/policies
 * - Natural language responses feel conversational
 * - Fallback handling when no relevant information is found
 * - Extensible - you can add more tools and knowledge sources
 *
 * COMMON DEBUGGING TIPS:
 * - Check console.log statements to see the execution flow
 * - Verify kb.json file exists and has correct format
 * - Ensure OpenAI API key is set in environment
 * - Test with exact questions from your knowledge base first
 * - Use the source ID to verify which KB record was matched
 */
