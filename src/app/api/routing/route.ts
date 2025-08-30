import OpenAI from "openai";
import z from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/*
 * Route handler for workflow management
 * - Define the data models
 * - Define the paths or options
 * - Create the main function to run everything and include if statements for the router
 */

/* Data Models
 - Is the request: new event, modify event, other
 - New Event Details: name, date, duration, participants
 - If its modification? What fields need to be updated? field? newValue
 - Modification Details: event, changes, participants
 - Calendar Response: success/failure, message, url calendar link
 */

const ExtractEvent = z.object({
  request_type: z.enum(["new_event", "modify_event", "other"]),
  confidence_score: z.number().min(0).max(1),
  description: z.string().min(2).max(500),
});

const NewEventDetails = z.object({
  name: z.string().min(2).max(100),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date",
  }),
  duration: z.number().min(1).nullable().optional(),
  participants: z.array(z.string()),
});

const ChangeFieldDetails = z.object({
  field: z.string().min(2).max(100),
  new_value: z.string().min(2).max(100),
});

const ModifyEventDetails = z.object({
  event: z.string().min(2).max(100),
  changes: z.array(ChangeFieldDetails),
  participants: z.array(z.string().email()).min(1),
});

const CalendarResponse = z.object({
  success: z.boolean(),
  message: z.string().min(2).max(500),
  url: z.string().url().nullable().optional(),
});

//Define the functions
const extractEvent = async (userInput: string) => {
  // Validate userInput
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    throw new Error("Invalid user input: userInput must be a non-empty string");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are helpful Ai Calendar Assistant, verify the prompt is about calendar events. Check if this is a new event, modify event or other event request.`,
      },
      { role: "user", content: userInput.trim() },
    ],
    response_format: zodResponseFormat(ExtractEvent, "extracted_event"),
  });

  // Parse the JSON response and validate with Zod
  const jsonResponse = JSON.parse(response.choices[0].message.content || "{}");
  const validatedResponse = ExtractEvent.parse(jsonResponse);

  console.log(validatedResponse, "extractEventInfo");
  return validatedResponse;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const newEvent = async (data: any) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI calendar assistant. Extract the event details from the user's request and return them in the specified format.",
      },
      {
        role: "user",
        content: `Create a new event with the following details: ${JSON.stringify(
          data.description
        )}`,
      },
    ],
    response_format: zodResponseFormat(NewEventDetails, "new_event"),
  });

  // Parse the JSON response and validate with Zod
  const jsonResponse = JSON.parse(response.choices[0].message.content || "{}");
  const validatedResponse = NewEventDetails.parse(jsonResponse);

  return validatedResponse;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modifyEvent = async (data: any) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI calendar assistant. Modify the event details based on the user's request and return them in the specified format.",
      },
      {
        role: "user",
        content: `Modify the following event: ${JSON.stringify(data)}`,
      },
    ],
    response_format: zodResponseFormat(ModifyEventDetails, "modify_event"),
  });

  // Parse the JSON response and validate with Zod
  const jsonResponse = JSON.parse(response.choices[0].message.content || "{}");
  const validatedResponse = ModifyEventDetails.parse(jsonResponse);

  return validatedResponse;
};

// const calendarResponse = (data: any): z.infer<typeof CalendarResponse> => {
//   return CalendarResponse.parse(data);
// };

export async function POST(request: Request) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    console.log("Received request body:", body);

    // Handle different request formats
    let userInput: string | undefined;

    // Check if it's the messages format (OpenAI chat format)
    if (body.messages && Array.isArray(body.messages)) {
      // Find the last user message (most recent)
      const userMessages = body.messages.filter(
        (msg: { role: string; content?: string }) =>
          msg.role === "user" && msg.content
      );
      if (userMessages.length > 0) {
        userInput = userMessages[userMessages.length - 1].content;
      }
    }
    // Check if it's the direct userInput format
    else if (body.userInput) {
      userInput = body.userInput;
    }

    // Validate userInput exists and is valid
    if (!userInput) {
      return Response.json(
        {
          success: false,
          error:
            "Missing required field 'userInput' or 'messages' with user content in request body",
        },
        { status: 400 }
      );
    }

    if (typeof userInput !== "string") {
      return Response.json(
        {
          success: false,
          error: "User input must be a string",
        },
        { status: 400 }
      );
    }

    if (userInput.trim() === "") {
      return Response.json(
        {
          success: false,
          error: "User input cannot be empty",
        },
        { status: 400 }
      );
    }

    const extractedEvent = await extractEvent(userInput);
    if (extractedEvent.confidence_score < 0.6) {
      return Response.json(
        {
          success: false,
          error: "Low confidence score",
          data: extractedEvent,
        },
        { status: 400 }
      );
    }

    let eventDetails = null;
    let responseMessage = `Classification: ${
      extractedEvent.request_type
    } (confidence: ${(extractedEvent.confidence_score * 100).toFixed(1)}%)\n`;
    responseMessage += `Description: ${extractedEvent.description}\n`;

    if (extractedEvent.request_type === "new_event") {
      eventDetails = await newEvent(extractedEvent);
      console.log(eventDetails, "newEventData");

      if (eventDetails) {
        responseMessage += `\n📅 Event Details:\n`;
        responseMessage += `• Name: ${eventDetails.name}\n`;
        responseMessage += `• Date: ${eventDetails.date}\n`;
        if (eventDetails.duration) {
          responseMessage += `• Duration: ${eventDetails.duration} minutes\n`;
        }
        responseMessage += `• Participants: ${eventDetails.participants.join(
          ", "
        )}\n`;
      }
    } else if (extractedEvent.request_type === "modify_event") {
      eventDetails = await modifyEvent(extractedEvent);
      console.log(eventDetails, "modifyEventData");

      if (eventDetails) {
        responseMessage += `\n📝 Modify Event Details:\n`;
        responseMessage += `• Event: ${eventDetails.event}\n`;
        responseMessage += `• Changes: ${eventDetails.changes
          .map((c) => `${c.field} → ${c.new_value}`)
          .join(", ")}\n`;
        responseMessage += `• Participants: ${eventDetails.participants.join(
          ", "
        )}\n`;
      }
    } else {
      responseMessage += `\nThis request doesn't appear to be calendar-related.`;
    }

    return Response.json({
      message: responseMessage,
      confidenceScore: extractedEvent.confidence_score,
      classification: extractedEvent,
      eventDetails: eventDetails,
      // Add calendar link for new events
      calendarLink:
        eventDetails &&
        extractedEvent.request_type === "new_event" &&
        "name" in eventDetails &&
        "date" in eventDetails
          ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
              eventDetails.name
            )}&dates=${encodeURIComponent(
              new Date(eventDetails.date)
                .toISOString()
                .replace(/[-:]/g, "")
                .replace(/\.\d{3}/, "")
            )}`
          : undefined,
    });
  } catch (error) {
    console.error("Error in routing API:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
