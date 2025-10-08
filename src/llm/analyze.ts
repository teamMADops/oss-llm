import { OpenAI } from "openai";
import * as vscode from "vscode";
import type { LLMResult } from "./types";

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
    parsed = JSON.parse(candidate);} catch {
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
    failureType: parsed.failureType ? String(parsed.failureType) : undefined,
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
  };

  if (!result.summary && !result.rootCause && !result.suggestion) {
    result.summary = stripped;
  }
  return result;
}

async function getOpenAIKey(context: vscode.ExtensionContext): Promise<string | null> {
  // 1. 사용자가 등록한 키를 우선적으로 확인
  const fromSecret = await context.secrets.get("openaiApiKey");
  if (fromSecret) {
    return fromSecret;
  }

  // 2. 개발 모드일 경우에만 .env 파일에서 키를 fallback으로 사용
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    const fromEnv = process.env.MADOPS_OPENAI_KEY || process.env.OPENAI_API_KEY;
    if (fromEnv) {
      console.log("🔑 등록된 OpenAI 키가 없어 .env 파일의 개발용 키를 사용합니다.");
      return fromEnv;
    }
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
      "OpenAI API Key가 설정되지 않았습니다. 명령어 팔레트에서 입력하세요."
    );
  }

  const client = new OpenAI({ apiKey: key });
  const topN = Math.max(1, Math.min(3, prompts.length));
  const chosen = prompts.slice(0, topN);

  const results: LLMResult[] = [];
  for (const p of chosen) {
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
        "형식 지침:",
        "- 출력은 오직 JSON입니다. 마크다운, 코드펜스, 설명 문장 금지.",
        "- 모든 문장은 공손한 종결(~습니다 체)로 작성합니다.",
        "- JSON 키는 고정: summary, rootCause, suggestion, failureType, confidence, affectedStep, filename, keyErrors.",
        "- keyErrors는 [{ line, snippet, note }] 형태로 작성하며, note도 ~습니다 체로 작성합니다.",
        "- confidence는 0~1 숫자로만 작성합니다.",
        "",
        "콘텐츠 지침:",
        "1) summary: 2~3문장으로 핵심만 요약합니다.",
        "2) rootCause: 실패의 핵심 원인을 한 문장으로 단호하게 서술합니다.",
        "3) suggestion: 명령어/수정 파일 경로/설정 키 등 구체적 조치를 제시합니다.",
        "4) failureType은 dependency|network|tooling|permissions|config|test|infra 중 하나를 권장합니다.",
        "5) chain-of-thought(사고 과정)는 절대 노출하지 않습니다.",
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
        '  ]',
        '}'
      ].join("\n"),
        },
        { role: "user", content: p },
      ],
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  results.push(parseJsonLenient(raw));
}
  results.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return results[0];
}
