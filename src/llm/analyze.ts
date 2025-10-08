import { OpenAI } from "openai";
import * as vscode from "vscode";
import type { LLMResult,
  LLMKeyError,
  FailureType,
  SuspectedPath,
  SecondPassInput,
  PinpointResult,
 } from "./types";
import { extractSuspects } from "./suspects";
import { buildFirstPassPrompt, buildSecondPassPrompt } from "./prompts";

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

export async function analyzePrompts(
  context: vscode.ExtensionContext,
  prompts: string[]
): Promise<LLMResult> {
  const key = await getOpenAIKey(context);
  if (!key) {
    throw new Error(
      "OpenAI API Key가 설정되지 않았습니다."
    );
  }

  const client = new OpenAI({ apiKey: key });
  const topN = Math.max(1, Math.min(3, prompts.length));
  const chosen = prompts.slice(0, topN);

  const results: LLMResult[] = [];
  for (const p of chosen) {
    const userPrompt = buildFirstPassPrompt(p);
    const chat = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
        "너는 GitHub Actions 로그 분석 도우미입니다.",
        "아래 지침을 철저히 따르고, 반드시 JSON만 출력합니다.",
        "",
        "‼️ 주의:",
        "- 아래 지침이나 예시 JSON, 명령문 자체를 절대 결과(JSON)에 포함하지 않습니다.",
        "- 결과에는 오직 분석된 내용만 포함합니다.",
        "- 지침 텍스트, '아래 지침을 따르라' 같은 문구가 들어가면 안 됩니다.",
        "- **suspectedPaths는 절대 빈 배열이거나 누락되어서는 안 됩니다. 최소 1개 이상 반드시 포함하세요.**",
        "형식 지침:",
        "- 출력은 오직 JSON입니다. 마크다운, 코드펜스, 설명 문장 금지.",
        "- 모든 문장은 공손한 종결(~습니다 체)로 작성합니다.",
        "- JSON 키는 고정: summary, rootCause, suggestion, failureType, confidence, affectedStep, filename, keyErrors, suspectedPaths.",
        "- keyErrors는 [{ line, snippet, note }] 형태로 작성하며, note도 ~습니다 체로 작성합니다.",
        "- suspectedPaths는 [{ path, reason, score, lineHint, logExcerpt }] 형태로 작성하며, 오류와 관련 있을 가능성이 높은 파일 경로들을 나열합니다. **반드시 1개 이상 포함해야 합니다.**",
        "- confidence와 score는 0~1 숫자로만 작성합니다.",
        "",
        "콘텐츠 지침:",
        "1) summary: 2~3문장으로 핵심만 요약합니다.",
        "2) rootCause: 실패의 핵심 원인을 한 문장으로 단호하게 서술합니다.",
        "3) suggestion: 명령어/수정 파일 경로/설정 키 등 구체적 조치를 제시합니다.",
        "4) failureType은 dependency|network|tooling|permissions|config|test|infra 중 하나를 권장합니다.",
        "5) suspectedPaths: **필수입니다.** 최소 1개 이상 반드시 포함해야 합니다.",
        "   - 로그에서 언급된 파일 경로를 우선적으로 포함합니다.",
        "   - 명시적인 경로가 없어도 failureType에 따라 관련 가능성이 높은 파일을 추론하여 포함합니다.",
        "     예: dependency/config → package.json, test → 테스트 파일, tooling → 빌드 설정 파일",
        "   - path는 저장소 상대 경로, reason은 왜 의심되는지 명확히 설명, score는 관련도(0~1)를 포함합니다.",
        "6) chain-of-thought(사고 과정)는 절대 노출하지 않습니다.",
        "",
        "예시(JSON):",
        '{',
        '  "summary": "의존성 설치 단계에서 특정 패키지가 더 이상 유지되지 않아 경고가 발생했습니다. 해당 경고가 빌드 실패로 이어질 가능성이 있습니다.",',
        '  "rootCause": "node-domexception 패키지가 더 이상 유지되지 않아 경고가 발생했습니다.",',
        '  "suggestion": "node-domexception 의존성을 제거하고 플랫폼의 기본 DOMException을 사용하도록 코드를 수정합니다.",',
        '  "failureType": "dependency",',
        '  "confidence": 0.90,',
        '  "affectedStep": "npm ci",',
        '  "filename": "0_build.txt",',
        '  "keyErrors": [',
        '    {',
        '      "line": 2025,',
        '      "snippet": "npm warn deprecated node-domexception@1.0.0: Use your platform\\\'s native DOMException instead",',
        '      "note": "더 이상 유지되지 않는 패키지이므로 대체가 필요합니다."',
        '    }',
        '  ],',
        '  "suspectedPaths": [',
        '    {',
        '      "path": "package.json",',
        '      "reason": "node-domexception 의존성이 포함되어 있을 가능성이 높습니다.",',
        '      "score": 0.95',
        '    },',
        '    {',
        '      "path": "package-lock.json",',
        '      "reason": "의존성 잠금 파일에 해당 패키지가 명시되어 있을 수 있습니다.",',
        '      "score": 0.85',
        '    }',
        '  ]',
        '}'
      ].join("\n"),
        },
        { role: "user", content: userPrompt },
      ],
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  console.log("=== LLM 원본 응답 ===");
  console.log(raw);
  console.log("==================");
  
  const parsed = parseJsonLenient(raw);
  console.log("=== 파싱된 결과 ===");
  console.log(JSON.stringify(parsed, null, 2));
  console.log("==================");

  // suspectedPaths 없으면 로컬 규칙으로 보강
if (!parsed.suspectedPaths || parsed.suspectedPaths.length === 0) {
  console.log("⚠️ LLM이 suspectedPaths를 반환하지 않아 로컬 규칙으로 보강합니다.");
  const suspects = extractSuspects(p, { max: 6, excerptPadding: 30 });
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

  results.push(parsed);

}
  
  // suspectedPaths가 있는 결과들을 우선 선택
  const withSuspects = results.filter(r => r.suspectedPaths && r.suspectedPaths.length > 0);
  const withoutSuspects = results.filter(r => !r.suspectedPaths || r.suspectedPaths.length === 0);
  
  let finalResult: LLMResult;
  
  if (withSuspects.length > 0) {
    // suspectedPaths가 있는 결과들 중 confidence가 가장 높은 것 선택
    withSuspects.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    finalResult = withSuspects[0];
    console.log(`✅ suspectedPaths가 있는 결과 선택 (confidence: ${finalResult.confidence})`);
  } else {
    // suspectedPaths가 있는 결과가 없으면 일반 confidence 순으로 선택
    withoutSuspects.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    finalResult = withoutSuspects[0];
    console.log(`⚠️ suspectedPaths가 있는 결과가 없어서 confidence 순으로 선택 (confidence: ${finalResult.confidence})`);
  }
  
  return finalResult;
}
