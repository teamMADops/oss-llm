import { OpenAI } from "openai";
import * as vscode from "vscode";
import type { LLMResult, FailureType } from "./types";
import { extractSuspects } from "./suspects";
import { SYSTEM_PROMPTS } from "./systemPrompts";
import { buildFirstPassPrompt } from "./prompts";
import { preprocessLogForLLM } from "./logPreprocess";
import { llmCache } from "./cache/llmCache";


// Constant for batching API requests
const ANALYSIS_BATCH_SIZE = 5;

function parseJsonLenient(text: string): LLMResult {
  const stripped = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate =
    start !== -1 && end !== -1 && end > start
      ? stripped.slice(start, end + 1)
      : stripped;

  let parsed: any;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return {
      summary: text,
      rootCause: "",
      suggestion: "",
      confidence: 0.2,
    };
  }

  const asString = (v: any) => (v == null ? "" : String(v));
  const asNumber01 = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : undefined;
  };

  const result: LLMResult = {
    // 필수 3필드 보장
    summary: asString(parsed.summary),
    rootCause: asString(parsed.rootCause),
    suggestion: asString(parsed.suggestion),

    // 확장 필드(선택)
    failureType: parsed.failureType ? String(parsed.failureType)  as FailureType : undefined,
    confidence: asNumber01(parsed.confidence) ?? 0.7,
    affectedStep: parsed.affectedStep ? String(parsed.affectedStep) : undefined,
    filename: parsed.filename ? String(parsed.filename) : undefined,
    keyErrors: Array.isArray(parsed.keyErrors)
      ? parsed.keyErrors.map((e: any) => ({
          line: Number.isFinite(Number(e?.line)) ? Number(e.line) : undefined,
          snippet: e?.snippet ? String(e.snippet) : undefined,
          note: e?.note ? String(e.note) : undefined,
        }))
      : undefined,

      suspectedPaths: Array.isArray(parsed.suspectedPaths)
      ? parsed.suspectedPaths.map((s: any) => ({
          path: String(s?.path ?? ""),
          reason: s?.reason ? String(s.reason) : "",
          score: typeof s?.score === "number" ? Math.max(0, Math.min(1, s.score)) : undefined,
          lineHint: Number.isFinite(Number(s?.lineHint)) ? Number(s.lineHint) : undefined,
          logExcerpt: s?.logExcerpt ? String(s.logExcerpt) : undefined,
        }))
      : undefined,
  };

  if (!result.summary && !result.rootCause && !result.suggestion) {
    result.summary = stripped;
  }
  return result;
}

async function getOpenAIKey(context: vscode.ExtensionContext): Promise<string | null> {
  // 사용자가 등록한 키 확인
  const fromSecret = await context.secrets.get("openaiApiKey");
  if (fromSecret) {
    return fromSecret;
  }

  return null;
}

// Helper function to perform analysis for a single prompt
async function performSingleAnalysis(
  client: OpenAI,
  prompt: string
): Promise<LLMResult> {
  const safeLog = preprocessLogForLLM(prompt, {
    maxTokens: 16000,
    safetyMargin: 1500,
    tailCount: 700,
  });

  const userPrompt = buildFirstPassPrompt(safeLog);

  // 캐시 키 구성
  const cacheKey = {
    namespace: "first-pass" as const,
    model: "gpt-3.5-turbo",
    systemPromptVersion: "fp-2025-10-12", // 날짜나 버전 문자열은 SYSTEM_PROMPTS 버전과 맞춰줘
    prompt: userPrompt,
  };

  const parsed = await llmCache.getOrCompute(cacheKey, async () => {
  const chat = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      SYSTEM_PROMPTS.FIRST_PASS,
      { role: "user", content: userPrompt },
    ],
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  console.log("=== LLM 원본 응답 ===");
  console.log(raw);
  console.log("==================");

  const result = parseJsonLenient(raw);
  console.log("=== 파싱된 결과 ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("==================");

  return { result, raw };
    });

  // Augment with local rules if LLM fails to provide suspectedPaths
  if (!parsed.suspectedPaths || parsed.suspectedPaths.length === 0) {
    console.log("⚠️ LLM이 suspectedPaths를 반환하지 않아 로컬 규칙으로 보강합니다.");
    const suspects = extractSuspects(prompt, { max: 6, excerptPadding: 30 });
    if (suspects.length) {
      parsed.suspectedPaths = suspects;
      console.log(`✅ 로컬 규칙으로 ${suspects.length}개의 의심 경로를 추가했습니다.`);
      console.log(JSON.stringify(suspects, null, 2));
    } else {
      console.log("❌ 로컬 규칙으로도 의심 경로를 찾지 못했습니다.");
    }
  } else {
    console.log(`✅ LLM이 ${parsed.suspectedPaths.length}개의 의심 경로를 반환했습니다.`);
  }

  return parsed;
}

export async function analyzePrompts(
  context: vscode.ExtensionContext,
  prompts: string[]
): Promise<LLMResult> {

  const key = await getOpenAIKey(context);
  if (!key) {
    throw new Error("OpenAI API Key가 설정되지 않았습니다.");
  }

  const client = new OpenAI({ apiKey: key });
  const topN = Math.max(1, Math.min(3, prompts.length));
  const chosen = prompts.slice(0, topN);

  const allResults: LLMResult[] = [];

  // Process prompts in batches
  for (let i = 0; i < chosen.length; i += ANALYSIS_BATCH_SIZE) {
    const batch = chosen.slice(i, i + ANALYSIS_BATCH_SIZE);
    
    const analysisPromises = batch.map(p => performSingleAnalysis(client, p));
    
    const settledResults = await Promise.allSettled(analysisPromises);

    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        console.error(`Analysis for prompt ${i + index} failed:`, result.reason);
        // Optionally create a placeholder error result
        allResults.push({
          summary: `An error occurred during analysis: ${result.reason}`,
          rootCause: "Analysis failed",
          suggestion: "Check the extension's output logs for more details.",
          confidence: 0.1,
        });
      }
    });
  }
  
  if (allResults.length === 0) {
      throw new Error("All analyses failed. Please check logs for details.");
  }

  // Select the best result from all collected results
  const withSuspects = allResults.filter(r => r.suspectedPaths && r.suspectedPaths.length > 0);
  const withoutSuspects = allResults.filter(r => !r.suspectedPaths || r.suspectedPaths.length === 0);
  
  let finalResult: LLMResult;
  
  if (withSuspects.length > 0) {
    withSuspects.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    finalResult = withSuspects[0];
    console.log(`✅ suspectedPaths가 있는 결과 선택 (confidence: ${finalResult.confidence})`);
  } else {
    withoutSuspects.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    finalResult = withoutSuspects[0];
    console.log(`⚠️ suspectedPaths가 있는 결과가 없어서 confidence 순으로 선택 (confidence: ${finalResult.confidence})`);
  }
  
  return finalResult;
}
