export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const signal = options.signal ?? controller.signal;
  try {
    const response = await fetch(path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      signal,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string; details?: unknown };
    if (!response.ok) {
      throw new ApiClientError(data.error || "Something went wrong. Please try again.", response.status, data.code, data.details);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("The request took too long. Please try again.");
    }
    throw new ApiClientError("You're offline");
  } finally {
    clearTimeout(timer);
  }
}
