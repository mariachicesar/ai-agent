import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.js";
import z from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
/*
 * Route handler for parallelization
 * Using async function you can ony do this when the LLM calls dont depend on each other
 * LLM Guardrails
 * - Is a set of predefined rules, constraints, or filtering mechanisms to designed to ensure the safe and effective use of LLMs. Generate safe and reliable outputs.
 * - Ensure that each LLM call is independent and does not rely on the state or output of previous calls
 * - Validate and sanitize all inputs to the LLM
 * - Implement error handling and fallback mechanisms
 */

/* Steps
 1. Define Validation Models
    - a. first check if its a calendar event
    - b. check if its a harmful or security concerns
 2. Define Parallel Validation Tasks
 3. Main Validation Function

*/

// Data Models
const ExtractEvent = z
  .object({
    isCalendarEvent: z
      .boolean()
      .describe(
        "Whether the user input is related to calendar events, scheduling, or time-based activities"
      ),
    confidence_score: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "Confidence level (0-1) in the calendar event classification accuracy"
      ),
    description: z
      .string()
      .describe(
        "Brief explanation of why this input was or wasn't classified as a calendar event"
      ),
  })
  .describe(
    "Calendar event classification results, determining if user input requires calendar-related processing"
  );

const SecurityConcerns = z
  .object({
    isHarmful: z
      .boolean()
      .describe(
        "Whether the input contains harmful, malicious, or inappropriate content"
      ),
    threatLevel: z
      .enum(["low", "medium", "high"])
      .describe(
        "The severity level of any security threats or harmful content detected"
      ),
    description: z
      .string()
      .describe(
        "Detailed explanation of any security concerns, threats, or policy violations identified in the input"
      ),
  })
  .describe(
    "Security validation results for user input, checking for harmful content, threats, and policy violations"
  );

//Define Parallel Validation Tasks
const validateEvent = async (input: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: "Determine if this is a calendar event request.",
      },
      { role: "user", content: input },
    ],
    response_format: zodResponseFormat(ExtractEvent, "extracted_event"),
  });

  // Parse the JSON response and validate with Zod
  const jsonResponse = JSON.parse(response.choices[0].message.content || "{}");
  return ExtractEvent.parse(jsonResponse);
};

const checkSecurity = async (input: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content:
          "Analyze the input for security concerns, harmful content, and policy violations.",
      },
      { role: "user", content: input },
    ],
    response_format: zodResponseFormat(SecurityConcerns, "security_concerns"),
  });

  // Parse the JSON response and validate with Zod
  const jsonResponse = JSON.parse(response.choices[0].message.content || "{}");
  return SecurityConcerns.parse(jsonResponse);
};

//Main Validation Function
const validateInput = async (input: string) => {
  try {
    const [eventResult, securityResult] = await Promise.all([
      validateEvent(input),
      checkSecurity(input),
    ]);

    return {
      event: eventResult,
      security: securityResult,
    };
  } catch (error) {
    throw new Error(
      `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received request body:", body);

    // Handle different request formats (same as routing endpoint)
    let userInput: string | undefined;

    if (body.messages && Array.isArray(body.messages)) {
      const userMessages = body.messages.filter(
        (msg: { role: string; content?: string }) =>
          msg.role === "user" && msg.content
      );
      if (userMessages.length > 0) {
        userInput = userMessages[userMessages.length - 1].content;
      }
    } else if (body.userInput) {
      userInput = body.userInput;
    }

    if (
      !userInput ||
      typeof userInput !== "string" ||
      userInput.trim() === ""
    ) {
      return Response.json(
        {
          success: false,
          error: "Missing or invalid user input",
        },
        { status: 400 }
      );
    }

    // Run parallel validations
    const validationResults = await validateInput(userInput.trim());

    // Create response message
    let responseMessage = `🔄 Parallel Validation Results:\n\n`;

    // Calendar validation results
    responseMessage += `📅 Calendar Event Check:\n`;
    responseMessage += `• Is Calendar Event: ${
      validationResults.event.isCalendarEvent ? "Yes" : "No"
    }\n`;
    responseMessage += `• Confidence: ${(
      validationResults.event.confidence_score * 100
    ).toFixed(1)}%\n`;
    responseMessage += `• Description: ${validationResults.event.description}\n\n`;

    // Security validation results
    responseMessage += `🔐 Security Check:\n`;
    responseMessage += `• Is Harmful: ${
      validationResults.security.isHarmful ? "Yes" : "No"
    }\n`;
    responseMessage += `• Threat Level: ${validationResults.security.threatLevel}\n`;
    responseMessage += `• Description: ${validationResults.security.description}\n`;

    return Response.json({
      message: responseMessage,
      validationResults: validationResults,
      parallelProcessingComplete: true,
    });
  } catch (error) {
    console.error("Error in parallelization API:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
