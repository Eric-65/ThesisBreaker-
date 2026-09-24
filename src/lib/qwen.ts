import "server-only";
import { qwenConfig, type QwenConfig } from "@/lib/env";

/**
 * Minimal client for Qwen via Bitget's OpenAI-compatible endpoint:
 *   POST {QWEN_BASE_URL}/chat/completions   Authorization: Bearer {BITGET_QWEN_API_KEY}
 *
 * Server-only. The key is read from env at call time and never leaves the server.
 */

export type QwenErrorKind = "config" | "auth" | "timeout" | "http" | "network" | "aborted" | "empty";

export class QwenError extends Error {
  constructor(
    message: string,
    readonly kind: QwenErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "QwenError";
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenUsage {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number | null;
  totalTokens: number;
}

export interface QwenRequest {
  messages: ChatMessage[];
  /** Ask for a JSON object (response_format), falling back to prompt-only if rejected. */
  json?: boolean;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onDelta?: (channel: "reasoning" | "content", text: string) => void;
}

export interface QwenResult {
  content: string;
  reasoning: string;
  usage: QwenUsage | null;
  model: string;
  latencyMs: number;
  attempts: number;
}

/**
 * Parameters the endpoint has rejected in this process. Remembered so we don't
 * burn a failed round-trip on every request after the first.
 */
const unsupported = { responseFormat: false, enableThinking: false, streamOptions: false };

type Droppable = keyof typeof unsupported;

function pickParamToDrop(errorText: string, sent: Record<Droppable, boolean>): Droppable | null {
  const t = errorText.toLowerCase();
  if (sent.responseFormat && /response_format|json_object|json mode|json_schema/.test(t)) return "responseFormat";
  if (sent.enableThinking && /enable_thinking|thinking/.test(t)) return "enableThinking";
  if (sent.streamOptions && /stream_options|include_usage/.test(t)) return "streamOptions";
  // Unspecific 400: shed optional parameters one at a time, most likely culprit first.
  if (sent.responseFormat) return "responseFormat";
  if (sent.enableThinking) return "enableThinking";
  if (sent.streamOptions) return "streamOptions";
  return null;
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number } | null;
}

function toUsage(u: RawUsage | undefined | null): QwenUsage | null {
  if (!u || typeof u.prompt_tokens !== "number") return null;
  return {
    promptTokens: u.prompt_tokens,
    completionTokens: u.completion_tokens ?? 0,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? null,
    totalTokens: u.total_tokens ?? u.prompt_tokens + (u.completion_tokens ?? 0),
  };
}

export function isQwenConfigured(): boolean {
  return Boolean(qwenConfig().apiKey);
}

export async function qwenChat(req: QwenRequest): Promise<QwenResult> {
  const cfg = qwenConfig();
  if (!cfg.apiKey) throw new QwenError("BITGET_QWEN_API_KEY is not set", "config");

  const started = Date.now();
  let attempts = 0;
  let retried5xx = false;

  // A bounded loop: at most 3 parameter drops + 1 server-error retry.
  while (attempts < 5) {
    attempts++;
    const sent: Record<Droppable, boolean> = {
      responseFormat: Boolean(req.json) && !unsupported.responseFormat,
      enableThinking: !unsupported.enableThinking,
      streamOptions: Boolean(req.stream) && !unsupported.streamOptions,
    };
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.2,
      stream: Boolean(req.stream),
    };
    if (req.maxTokens) body.max_tokens = req.maxTokens;
    if (sent.responseFormat) body.response_format = { type: "json_object" };
    if (sent.enableThinking) body.enable_thinking = cfg.enableThinking;
    if (sent.streamOptions) body.stream_options = { include_usage: true };

    const res = await send(cfg, body, req.signal);

    if (res.status === 400 || res.status === 422) {
      const text = await res.text().catch(() => "");
      const drop = pickParamToDrop(text, sent);
      if (!drop) throw new QwenError(`Qwen rejected the request (${res.status}): ${text.slice(0, 300)}`, "http", res.status);
      unsupported[drop] = true;
      continue;
    }
    if (res.status >= 500) {
      const text = await res.text().catch(() => "");
      if (!retried5xx) {
        retried5xx = true;
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw new QwenError(`Qwen server error ${res.status}: ${text.slice(0, 200)}`, "http", res.status);
    }
    if (res.status === 401 || res.status === 403) {
      throw new QwenError(`Qwen auth failed (${res.status}) — check BITGET_QWEN_API_KEY`, "auth", res.status);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new QwenError(`Qwen HTTP ${res.status}: ${text.slice(0, 200)}`, "http", res.status);
    }

    const out = req.stream ? await readStream(res, req.onDelta) : await readJson(res);
    if (!out.content.trim()) throw new QwenError("Qwen returned an empty response", "empty");
    return { ...out, model: out.model || cfg.model, latencyMs: Date.now() - started, attempts };
  }
  throw new QwenError("Qwen request failed after retries", "http");
}

/** fetch with a hard timeout that also covers reading a streamed body. */
async function send(cfg: QwenConfig, body: Record<string, unknown>, external?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(cfg.timeoutMs);
  const signal = external ? AbortSignal.any([timeout, external]) : timeout;
  try {
    return await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: body.stream ? "text/event-stream" : "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (err) {
    throw mapAbort(err, timeout, external, cfg.timeoutMs);
  }
}

function mapAbort(err: unknown, timeout: AbortSignal, external: AbortSignal | undefined, ms: number): QwenError {
  if (err instanceof QwenError) return err;
  if (external?.aborted) return new QwenError("Request cancelled", "aborted");
  if (timeout.aborted) return new QwenError(`Qwen timed out after ${ms} ms`, "timeout");
  return new QwenError(`Could not reach Qwen: ${(err as Error).message}`, "network");
}

interface ChoiceChunk {
  delta?: { content?: string | null; reasoning_content?: string | null };
  message?: { content?: string | null; reasoning_content?: string | null };
}

async function readJson(res: Response) {
  const json = (await res.json()) as { model?: string; choices?: ChoiceChunk[]; usage?: RawUsage };
  const msg = json.choices?.[0]?.message;
  return {
    content: msg?.content ?? "",
    reasoning: msg?.reasoning_content ?? "",
    usage: toUsage(json.usage),
    model: json.model ?? "",
  };
}

async function readStream(res: Response, onDelta: QwenRequest["onDelta"]) {
  if (!res.body) throw new QwenError("Qwen returned no stream body", "empty");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let usage: QwenUsage | null = null;
  let model = "";

  const handle = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let chunk: { model?: string; choices?: ChoiceChunk[]; usage?: RawUsage };
    try {
      chunk = JSON.parse(data);
    } catch {
      return; // ignore keep-alives / malformed frames
    }
    if (chunk.model) model = chunk.model;
    if (chunk.usage) usage = toUsage(chunk.usage) ?? usage;
    const delta = chunk.choices?.[0]?.delta;
    if (delta?.reasoning_content) {
      reasoning += delta.reasoning_content;
      onDelta?.("reasoning", delta.reasoning_content);
    }
    if (delta?.content) {
      content += delta.content;
      onDelta?.("content", delta.content);
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(handle);
    }
    buffer += decoder.decode();
    if (buffer) handle(buffer);
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new QwenError("Qwen stream timed out", "timeout");
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new QwenError("Qwen stream aborted", "aborted");
    }
    throw new QwenError(`Qwen stream failed: ${(err as Error).message}`, "network");
  }
  return { content, reasoning, usage, model };
}

/** Pull the first JSON object out of a model reply (tolerates code fences and prose). */
export function extractJsonObject(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in model output");
  return JSON.parse(unfenced.slice(start, end + 1));
}
