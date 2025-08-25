/**
 * =============================================================================
 * OPENAI FUNCTION/TOOL CALLING API ROUTE - STUDY GUIDE
 * =============================================================================
 *
 * This file demonstrates how to implement OpenAI's Function Calling feature.
 *
 * 🎯 WHAT IS FUNCTION CALLING?
 * Function calling allows AI models to call external functions/APIs to get
 * real-time data instead of just generating text from their training data.
 *
 * 📝 THE COMPLETE FLOW:
 * 1. User sends a message (e.g., "What's the weather in Paris?")
 * 2. We call OpenAI with tools/functions available
 * 3. OpenAI decides if it needs to call a tool and returns tool_calls
 * 4. We execute the requested tool(s) and get real data
 * 5. We send the tool results back to OpenAI
 * 6. OpenAI generates a final human-readable response
 * 7. We return that response to the user
 */

import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// =============================================================================
// STEP 1: INITIALIZE OPENAI CLIENT
// =============================================================================
/**
 * Create an OpenAI client instance with your API key.
 * This client will be used to make requests to OpenAI's API.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// STEP 2: DEFINE YOUR TOOL FUNCTIONS
// =============================================================================
/**
 * This is the actual function that gets executed when OpenAI decides it needs
 * weather data. Think of this as your "backend service" that provides real data.
 *
 * 🔍 STUDY NOTES:
 * - This function fetches real data from an external API
 * - It returns structured data (object with temperature and wind_speed)
 * - The function signature (parameters and return type) should match what
 *   you describe to OpenAI in the tool definition
 *
 * @param latitude - Geographic latitude coordinate
 * @param longitude - Geographic longitude coordinate
 * @returns Promise containing weather data object
 */
async function get_weather(
  latitude: number,
  longitude: number
): Promise<{ temperature: number; wind_speed: number }> {
  console.log(`🌤️ Fetching weather for: ${latitude}, ${longitude}`);

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m`
  );
  const data = await response.json();

  const weatherData = {
    temperature: data.current.temperature_2m,
    wind_speed: data.current.wind_speed_10m,
  };

  console.log(`🌤️ Weather fetched:`, weatherData);
  return weatherData;
}

// =============================================================================
// STEP 3: DEFINE TOOLS FOR OPENAI
// =============================================================================
/**
 * This is how we describe our functions to OpenAI. Think of this as a "menu"
 * that tells OpenAI what functions are available and how to use them.
 *
 * 🔍 STUDY NOTES:
 * - OpenAI uses this description to decide WHEN to call the function
 * - The description should be clear and specific
 * - Parameters must match exactly what your function expects
 * - OpenAI will use this to generate the correct arguments
 *
 * 📋 TOOL DEFINITION STRUCTURE:
 * - type: Always "function" for function calling
 * - function.name: Must match your actual function name
 * - function.description: Clear explanation of what the function does
 * - function.parameters: JSON Schema describing the parameters
 */
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description:
        "Get current weather information for any location using latitude and longitude coordinates",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude coordinate of the location (-90 to 90)",
          },
          longitude: {
            type: "number",
            description: "Longitude coordinate of the location (-180 to 180)",
          },
        },
        required: ["latitude", "longitude"],
        additionalProperties: false,
      },
    },
  },
];

// =============================================================================
// STEP 4: FUNCTION DISPATCHER
// =============================================================================
/**
 * This function acts as a "router" or "dispatcher" that takes function calls
 * from OpenAI and routes them to the correct implementation.
 *
 * 🔍 STUDY NOTES:
 * - OpenAI sends us the function name and arguments as strings
 * - We need to parse the arguments and call the correct function
 * - This pattern allows you to easily add more tools/functions later
 * - It's like a switch statement for function calls
 *
 * 🎯 WHY DO WE NEED THIS?
 * OpenAI doesn't call your functions directly. Instead, it tells you:
 * "I want to call function X with arguments Y" and you execute it.
 *
 * @param name - The name of the function OpenAI wants to call
 * @param args - The arguments OpenAI wants to pass (as object or array)
 */
//  Execute get_weather function: using our tool with response from LLM to fill in params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call_function(name: string, args: any) {
  console.log(`🔧 Dispatching function call: ${name}`);
  console.log(`📝 Arguments received:`, args);

  if (name === "get_weather") {
    // Support both positional and object args
    if (Array.isArray(args)) {
      // If args is an array: [latitude, longitude]
      return await get_weather(args[0], args[1]);
    } else {
      // If args is an object: { latitude: 48.8566, longitude: 2.3522 }
      return await get_weather(args.latitude, args.longitude);
    }
  }

  // If we get here, OpenAI tried to call a function we don't have
  throw new Error(`❌ Unknown function: ${name}`);
}

// =============================================================================
// STEP 5: DATA VALIDATION SCHEMA
// =============================================================================
/**
 * This Zod schema validates that our weather function returns the expected data.
 *
 * 🔍 STUDY NOTES:
 * - Zod is a TypeScript-first schema validation library
 * - It ensures our function returns the correct data structure
 * - If the external API changes, we'll catch it here instead of sending bad data
 * - This is a best practice for production applications
 *
 * 🎯 WHY VALIDATE?
 * - External APIs can change or return unexpected data
 * - Validation catches errors early
 * - Ensures consistent data format for OpenAI
 */
const WeatherResponse = z.object({
  temperature: z.number(),
  wind_speed: z.number(),
});

// =============================================================================
// STEP 6: MAIN API ROUTE HANDLER
// =============================================================================
/**
 * This is the main API endpoint that handles the entire tool calling flow.
 * It's a Next.js API route that responds to POST requests.
 *
 * 🔍 STUDY THE COMPLETE FLOW:
 * 1. Parse incoming request
 * 2. Call OpenAI with messages and available tools
 * 3. Check if OpenAI wants to use any tools
 * 4. If yes: execute tools and call OpenAI again with results
 * 5. If no: return the direct response
 * 6. Handle any errors gracefully
 */
export async function POST(request: NextRequest) {
  console.log("\n🚀 ========== NEW TOOL CALLING REQUEST ==========");

  try {
    // =====================================================================
    // SUBSTEP 6.1: PARSE AND VALIDATE REQUEST
    // =====================================================================
    console.log("📥 Step 1: Parsing incoming request...");

    const body = await request.json();
    console.log("📨 Received request body:", body);

    const { messages } = body;

    // Validate that messages is an array (basic input validation)
    if (!Array.isArray(messages)) {
      throw new Error(
        `Expected messages to be an array, got: ${typeof messages}`
      );
    }

    console.log("Request validated successfully");

    // =====================================================================
    // SUBSTEP 6.2: PREPARE CONVERSATION WITH SYSTEM PROMPT
    // =====================================================================
    console.log("Step 2: Preparing conversation messages...");

    // System prompt gives OpenAI context about its role and available tools
    const systemPrompt =
      "You are a helpful assistant that provides weather information. ";

    const messagesWithSystem: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages, // Spread the user's messages
    ];

    console.log(`Prepared ${messagesWithSystem.length} messages for OpenAI`);

    // =====================================================================
    // SUBSTEP 6.3: FIRST OPENAI CALL - CHECK IF TOOLS ARE NEEDED
    // =====================================================================
    console.log("🤖 Step 3: Making first OpenAI call with tools available...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: messagesWithSystem,
      tools: tools, // This tells OpenAI what functions are available
    });

    console.log("First OpenAI call completed");
    console.log(completion, "completion");

    // =====================================================================
    // SUBSTEP 6.4: CHECK IF OPENAI WANTS TO USE TOOLS
    // =====================================================================
    console.log("🔍 Step 4: Checking if OpenAI wants to call any tools...");

    // Extract tool calls from OpenAI's response (if any)
    const toolCalls = completion.choices[0]?.message?.tool_calls || [];
    console.log(`🛠️ OpenAI requested ${toolCalls.length} tool calls`);

    if (toolCalls.length > 0) {
      // ===================================================================
      // SUBSTEP 6.5: EXECUTE TOOLS AND PREPARE FOR SECOND CALL
      // ===================================================================
      console.log("⚡ Step 5: OpenAI wants to use tools - executing them...");

      // IMPORTANT: Add OpenAI's message WITH tool_calls to the conversation
      // This is required by the OpenAI API - you must include the assistant's
      // message that contains the tool_calls before adding tool responses
      messagesWithSystem.push({
        role: "assistant",
        content: null, // Content can be null when there are tool_calls
        tool_calls: toolCalls,
      });

      console.log("📝 Added assistant message with tool_calls to conversation");

      // Execute each tool call
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") {
          console.log("⏭️ Skipping non-function tool call");
          continue;
        }

        console.log(`🔧 Executing: ${toolCall.function.name}`);
        console.log(`📝 Arguments: ${toolCall.function.arguments}`);

        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        // Call our function dispatcher
        const result = await call_function(name, args);

        // Validate the result with Zod schema
        let validatedResult;
        try {
          validatedResult = WeatherResponse.parse(result);
          console.log("Tool result validated:", validatedResult);
        } catch (validationError) {
          console.error("Validation failed:", validationError);
          throw new Error(`Weather data validation failed: ${validationError}`);
        }

        // Add tool response message to the conversation
        // This is how we send the function result back to OpenAI
        messagesWithSystem.push({
          role: "tool",
          tool_call_id: toolCall.id, // Must match the tool call ID
          content: JSON.stringify(validatedResult),
        });

        console.log("Tool result added to conversation");
      }

      // ===================================================================
      // SUBSTEP 6.6: SECOND OPENAI CALL - GET FINAL RESPONSE
      // ===================================================================
      console.log("Step 6: Making second OpenAI call with tool results...");

      // Call OpenAI again with the tool results included in the conversation
      const completion_2 = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messagesWithSystem, // Now includes tool results
      });

      console.log("Second OpenAI call completed");
      console.log(completion_2, "completion_2");

      // Return the final response to the user
      console.log("📤 Sending final response to user");
      return NextResponse.json({
        message: completion_2.choices[0]?.message?.content || "No response",
      });
    }

    // =====================================================================
    // SUBSTEP 6.7: NO TOOLS NEEDED - RETURN DIRECT RESPONSE
    // =====================================================================
    console.log("ℹStep 5: No tools needed, returning direct response");

    // If OpenAI didn't request any tools, just return its direct response
    return NextResponse.json({
      message: completion.choices[0]?.message?.content || "No response",
    });
  } catch (error) {
    // =====================================================================
    // SUBSTEP 6.8: ERROR HANDLING
    // =====================================================================
    console.error("\n========== ERROR IN TOOL ROUTE ==========");
    console.error("Error details:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * =============================================================================
 * 📚 STUDY GUIDE - KEY CONCEPTS TO UNDERSTAND
 * =============================================================================
 *
 * 🎯 MAIN CONCEPTS:
 *
 * 1. **FUNCTION CALLING FLOW:**
 *    User Message → OpenAI (with tools) → Tool Execution → OpenAI (with results) → Final Response
 *
 * 2. **MESSAGE ROLES:**
 *    • "system": Instructions and context for the AI
 *    • "user": Messages from the human user
 *    • "assistant": Messages from OpenAI (can include tool_calls)
 *    • "tool": Results from function executions
 *
 * 3. **TOOL DEFINITION:**
 *    • Describes what functions are available to OpenAI
 *    • Must include clear descriptions and parameter schemas
 *    • OpenAI uses this to decide WHEN and HOW to call functions
 *
 * 4. **TWO-STEP PROCESS:**
 *    • Step 1: Call OpenAI → Get tool_calls (if needed)
 *    • Step 2: Execute tools → Call OpenAI again → Get final response
 *
 * 🔍 IMPORTANT DETAILS:
 *
 * • **Tool Call ID**: Each tool call has a unique ID that must be included in the response
 * • **Message Order**: Assistant message with tool_calls MUST come before tool responses
 * • **JSON Parsing**: Tool arguments come as JSON strings and must be parsed
 * • **Validation**: Always validate tool results to catch API changes
 *
 * 🚨 COMMON MISTAKES TO AVOID:
 *
 * • Don't forget to add the assistant message with tool_calls to conversation
 * • Don't skip the tool_call_id in tool response messages
 * • Don't assume external APIs will always return expected data
 * • Remember: console.logs appear in your SERVER terminal, not browser console
 *
 * 🧪 TESTING TIPS:
 *
 * • Test with: "What's the weather in Paris?"
 * • Watch the server logs to see the complete flow
 * • Try edge cases like invalid coordinates
 * • Test with questions that don't need tools
 *
 * 📖 NEXT STEPS FOR LEARNING:
 *
 * • Add more tools (calculator, search, etc.)
 * • Implement error handling for external API failures
 * • Add input validation for coordinates
 * • Try different OpenAI models
 * • Experiment with tool_choice parameter
 */
