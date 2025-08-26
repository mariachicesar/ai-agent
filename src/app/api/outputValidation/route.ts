import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod.js";

/**
 * Step 1: Define the data models for each stage : What i want to get back from the system
 * - #1 LLM: Event Extraction basic information : decide if its calendar event
 * - #2 LLM: Extract the details
 * - #3 LLM: Generate confirmation message
 * Step 2: Define the functions :
 * - eventExtractionFunc: Extracts basic information about the event
 * - detailExtractionFunc: Extracts detailed information about the event
 * - confirmationMessageFunc: Generates a confirmation message for the user
 * Step 3: Chain the functions together
 * Step 4: Test the chain with a valid input
 * Step 5: Test the chain with an invalid input
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

// Step #2: Validate the request and extract event information
export async function POST(request: NextRequest) {
  try {
    const { message, model = "gpt-3.5-turbo" } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        { role: "system", content: "Extract the event information." },
        {
          role: "user",
          content: message,
        },
      ],
      text: {
        format: zodTextFormat(CalendarEvent, "event"),
      },
    });

    const event = response.output_parsed;

    return NextResponse.json({
      message: event, //now we can use the extracted event information to create a calendar event and build systems around it
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
