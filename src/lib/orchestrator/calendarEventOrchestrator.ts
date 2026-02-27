import OpenAI from "openai";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

export async function extractCalendarEvent(message: string) {
  if (!message || typeof message !== "string") {
    throw new Error("Message is required");
  }

  const response = await openai.responses.parse({
    model: "gpt-4o-2024-08-06",
    input: [
      { role: "system", content: "Extract the event information." },
      { role: "user", content: message },
    ],
    text: {
      format: zodTextFormat(CalendarEvent, "event"),
    },
  });

  return {
    event: response.output_parsed,
    debug: {
      steps: [
        {
          step: 1,
          description: "Input validation",
          data: {
            userMessage: message,
            messageType: typeof message,
          },
        },
        {
          step: 2,
          description: "OpenAI structured output parsing",
          data: {
            model: "gpt-4o-2024-08-06",
            systemPrompt: "Extract the event information.",
            zodSchema: {
              name: "CalendarEvent",
              properties: {
                name: "string",
                date: "string",
                participants: "array of strings",
              },
            },
            rawResponse: response,
          },
        },
        {
          step: 3,
          description: "Parsed calendar event",
          data: {
            extractedEvent: response.output_parsed,
            validationPassed: true,
          },
        },
      ],
    },
  };
}
