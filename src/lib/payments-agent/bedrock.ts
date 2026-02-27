import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

interface BedrockParams {
  userPrompt: string;
  systemPrompt: string;
}

interface BedrockDecision {
  summary: string;
  action: "investigate" | "reconcile" | "create_payment_link" | "refund";
  reason: string;
}

/**
 * Calls Bedrock for structured operational intent selection.
 * Step 1: Build policy-aware model prompt.
 * Step 2: Invoke Bedrock model and parse text response.
 * Step 3: Validate response shape or fallback.
 */
export async function getBedrockDecision(
  params: BedrockParams,
): Promise<BedrockDecision> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  const region = process.env.AWS_REGION;

  if (!modelId || !region) {
    return fallbackDecision(params.userPrompt);
  }

  const client = new BedrockRuntimeClient({ region });
  const prompt = `${params.systemPrompt}\n\nUser request:\n${params.userPrompt}\n\nReturn strict JSON with keys: summary, action, reason.`;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await client.send(command);
  const raw = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(raw);
  const text = parsed?.content?.[0]?.text;

  if (!text) {
    return fallbackDecision(params.userPrompt);
  }

  try {
    const json = JSON.parse(text) as BedrockDecision;
    if (!json.summary || !json.action || !json.reason) {
      return fallbackDecision(params.userPrompt);
    }
    return json;
  } catch {
    return fallbackDecision(params.userPrompt);
  }
}

/**
 * Deterministic fallback classifier used when Bedrock is unavailable
 * or response shape is invalid.
 * Step 1: Apply keyword-based intent detection.
 * Step 2: Return safe default decision when ambiguous.
 */
function fallbackDecision(userPrompt: string): BedrockDecision {
  const normalized = userPrompt.toLowerCase();

  if (normalized.includes("link")) {
    return {
      summary: "User asked to generate a payment link.",
      action: "create_payment_link",
      reason: "Contains payment-link intent.",
    };
  }

  if (normalized.includes("refund")) {
    return {
      summary: "User asked for a refund related action.",
      action: "refund",
      reason: "Contains refund intent.",
    };
  }

  if (normalized.includes("reconcile") || normalized.includes("mismatch")) {
    return {
      summary: "User needs reconciliation and issue investigation.",
      action: "reconcile",
      reason: "Contains reconciliation intent.",
    };
  }

  return {
    summary: "General payment investigation requested.",
    action: "investigate",
    reason: "Default operational investigation path.",
  };
}
