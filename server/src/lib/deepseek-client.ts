import type { DeepSeekModel } from "./app-state.js";

interface DeepSeekMessage {
  role: "system" | "user";
  content: string;
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function callDeepSeek(input: {
  apiKey: string;
  model: DeepSeekModel;
  messages: DeepSeekMessage[];
}): Promise<string> {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: 0.3
    })
  });

  const payload = (await response.json()) as DeepSeekChatResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "DeepSeek request failed");
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }

  return content;
}

