import { NextRequest, NextResponse } from "next/server";
import { extractCalendarEvent } from "@/lib/orchestrator/calendarEventOrchestrator";
import jwt from "jsonwebtoken";

// Example dangerous keywords to block
const DANGEROUS_KEYWORDS = [
  "delete",
  "drop table",
  "shutdown",
  "format disk",
  "rm -rf",
  "truncate",
  "sudo",
  "system(",
  "exec(",
];

// Example quota store (in-memory for demo; use Redis or DB in prod)
const quotaStore = new Map();
const QUOTA_LIMIT = 100; // max requests per user per day

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

// --- Gateway Helper Functions ---
function isDangerous(message: string): boolean {
  return DANGEROUS_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));
}

function getUserIdFromJWT(token: string): string | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "demo_secret",
    ) as any;
    return decoded.sub || decoded.id || decoded.user || "anonymous";
  } catch {
    return null;
  }
}

function checkQuota(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const quotaKey = `${userId}:${today}`;
  const used = quotaStore.get(quotaKey) || 0;
  if (used >= QUOTA_LIMIT) return false;
  quotaStore.set(quotaKey, used + 1);
  return true;
}

// --- Main Gateway Handler ---
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // 1. Block dangerous calls
    if (isDangerous(message)) {
      return NextResponse.json(
        {
          error:
            "Request contains potentially dangerous content and was blocked.",
        },
        { status: 400 },
      );
    }

    // 2. Authenticate JWT (Authorization: Bearer <token>)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const userId = getUserIdFromJWT(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    // 3. Enforce quota (per user, per day)
    if (!checkQuota(userId)) {
      return NextResponse.json(
        { error: "Quota exceeded. Please try again tomorrow." },
        { status: 429 },
      );
    }

    // 4. Call orchestrator
    const { event, debug } = await extractCalendarEvent(message);

    return NextResponse.json({
      message: event,
      debug,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
