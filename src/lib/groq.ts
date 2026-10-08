const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

type Message = { role: "system" | "user" | "assistant"; content: string };

async function request(key: string, model: string, messages: Message[], opts: { maxTokens?: number; json?: boolean }) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 800,
      temperature: 0.6,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
}

export async function groqChat(
  messages: Message[],
  opts: { model?: string; maxTokens?: number; json?: boolean } = {},
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const model = opts.model || process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  try {
    let res = await request(key, model, messages, opts);
    // Groq retires models; a stale GROQ_MODEL must not silence the assistant.
    if (res.status === 404 && model !== DEFAULT_MODEL) {
      console.error(`Groq model ${model} unavailable, retrying with ${DEFAULT_MODEL}`);
      res = await request(key, DEFAULT_MODEL, messages, opts);
    }
    if (!res.ok) {
      console.error(`Groq request failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("Groq request failed", error);
    return null;
  }
}
