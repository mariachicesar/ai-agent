import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, model = "gpt-3.5-turbo" } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content,
      usage: completion.usage,
      debug: {
        steps: [
          {
            step: 1,
            description: "Chat completion request",
            data: {
              model: model,
              messagesCount: messages.length,
              messages: messages,
              parameters: {
                max_tokens: 1000,
                temperature: 0.7,
              },
            },
          },
          {
            step: 2,
            description: "OpenAI response",
            data: {
              response: completion,
              usage: completion.usage,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
