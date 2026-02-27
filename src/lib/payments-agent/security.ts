const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all|previous|earlier)\s+instructions/i,
  /reveal\s+(your|the)\s+(system prompt|prompt)/i,
  /print\s+secrets?/i,
  /export\s+keys?/i,
  /bypass\s+(policy|guardrails?|security)/i,
];

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /(?<![A-Za-z0-9])[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}(?![A-Za-z0-9])/g,
];

/**
 * Redacts known secret-like substrings and limits prompt length.
 * Step 1: Scan prompt for known secret/token patterns.
 * Step 2: Replace matches with `[REDACTED]`.
 * Step 3: Enforce safe max prompt length.
 */
export function sanitizePrompt(prompt: string): string {
  let sanitized = prompt;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized.slice(0, 4000);
}

/**
 * Detects suspicious prompt-injection patterns and returns block reasons.
 * Step 1: Evaluate prompt against injection signatures.
 * Step 2: Collect matched reasons for auditability.
 * Step 3: Return block decision.
 */
export function detectPromptInjection(prompt: string): {
  blocked: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      reasons.push(`Matched pattern: ${pattern.source}`);
    }
  }

  return {
    blocked: reasons.length > 0,
    reasons,
  };
}
