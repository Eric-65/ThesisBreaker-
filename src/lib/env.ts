import "server-only";
import { z } from "zod";

// Empty strings in .env files mean "unset".
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const QwenEnv = z.object({
  BITGET_QWEN_API_KEY: z.preprocess(blank, z.string().optional()),
  QWEN_BASE_URL: z.preprocess(blank, z.url().default("https://hackathon.bitgetops.com/v1")),
  QWEN_MODEL: z.preprocess(blank, z.string().default("qwen3.8-max")),
  QWEN_ENABLE_THINKING: z.preprocess(
    blank,
    z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  ),
  QWEN_TIMEOUT_MS: z.preprocess(blank, z.coerce.number().int().positive().default(45_000)),
});

export interface QwenConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  enableThinking: boolean;
  timeoutMs: number;
}

/** Read lazily so a missing key never breaks the build — it just switches to the offline heuristic. */
export function qwenConfig(): QwenConfig {
  const env = QwenEnv.parse(process.env);
  return {
    apiKey: env.BITGET_QWEN_API_KEY,
    baseUrl: env.QWEN_BASE_URL.replace(/\/+$/, ""),
    model: env.QWEN_MODEL,
    enableThinking: env.QWEN_ENABLE_THINKING,
    timeoutMs: env.QWEN_TIMEOUT_MS,
  };
}
