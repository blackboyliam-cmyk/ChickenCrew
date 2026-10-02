const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function groqChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { model?: string; maxTokens?: number },
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts?.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      messages,
      max_tokens: opts?.maxTokens ?? 800,
      temperature: 0.6,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}
