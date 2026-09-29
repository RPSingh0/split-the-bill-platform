import type { ApiError } from "@/lib/types";

const MESSAGES: Record<string, string> = {
  LLM_KEY_INVALID: "Your API key was rejected. Check that it's correct and active, then try again.",
  LLM_QUOTA_EXCEEDED:
    "Your API key has hit its quota or rate limit. Wait a minute and try again. Gemini limits apply per project, not per key.",
  LLM_CONTENT_BLOCKED: "The provider refused to read this receipt. Try another photo or paste the text instead.",
  LLM_TIMEOUT: "Reading the receipt took too long. Please try again.",
  LLM_UNAVAILABLE: "The AI provider isn't responding right now. Please try again in a moment.",
  LLM_BAD_OUTPUT: "The AI sent back something we couldn't read. Please try again.",
  BILL_NOT_FOUND: "This bill link doesn't exist. Check the link with whoever shared it.",
  BILL_FULL: "This bill already has 10 people, so no one else can join.",
  BILL_DONE: "This bill is already settled, so new people can't join.",
  BILL_CANCELLED: "The host cancelled this bill.",
};

export function errorMessage(error: ApiError) {
  if (MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }

  return error.message;
}
