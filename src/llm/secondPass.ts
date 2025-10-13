import { OpenAI } from "openai";
import * as vscode from "vscode";
import { SYSTEM_PROMPTS } from "./prompts/systemPrompts";
import { buildSecondPassPrompt } from "./prompts/prompts";
import type { SecondPassInput, PinpointResult } from "./types/types";
import { pinpointCache } from "./cache/pinpointCache";

export async function analyzeSecondPass(
  context: vscode.ExtensionContext,
  input: SecondPassInput
): Promise<PinpointResult> {

  const key = await context.secrets.get("openaiApiKey");
  if (!key) throw new Error("OpenAI API Key가 설정되지 않았습니다.");

  const client = new OpenAI({ apiKey: key });
  const userPrompt = buildSecondPassPrompt(input);

  const cacheKey = {
    namespace: "second-pass" as const,
    model: "gpt-3.5-turbo",
    systemPromptVersion: "sp-2025-10-12",
    prompt: userPrompt,
    ttlMs: 6 * 60 * 60 * 1000, // 6시간
  };

const parsed = await pinpointCache.getOrCompute(cacheKey, async () => {
  const chat = await client.chat.completions.create({
    model: "gpt-3.5-turbo", 
    temperature: 0,
    messages: [
      SYSTEM_PROMPTS.SECOND_PASS,
      { role: "user", content: userPrompt },
    ],
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  let result: PinpointResult;

  try {
      result = JSON.parse(
        raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim()
      ) as PinpointResult;
    } catch {
      result = {
        file: input.path,
        unifiedDiff: "",
        checklist: ["응답을 JSON으로 해석할 수 없습니다."],
        confidence: 0.0,
      };
    }

    return { result, raw }; // 캐시에 저장
    });

  return parsed;
}