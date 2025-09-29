import { OpenAI } from "openai";
import * as vscode from "vscode";


export type LLMResult = {
  summary: string;
  rootCause: string;
  suggestion: string;
};

function parseJsonLenient(text: string): LLMResult {
  // ```json ... ``` 같은 코드펜스 제거
  const stripped = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 가장 바깥쪽 { } 블록만 추출
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate =
    start !== -1 && end !== -1 && end > start
      ? stripped.slice(start, end + 1)
      : stripped;

  try {
    const parsed = JSON.parse(candidate);
    return {
      summary: String(parsed.summary ?? ""),
      rootCause: String(parsed.rootCause ?? ""),
      suggestion: String(parsed.suggestion ?? ""),
    };
  } catch {
    // 파싱 실패 → 원문을 summary에 넣어 반환
    return { summary: text, rootCause: "", suggestion: "" };
  }
}

export async function analyzePrompts(
  context: vscode.ExtensionContext,
  prompts: string[]
): Promise<LLMResult> {
  const key = await context.secrets.get("openaiApiKey");
  if (!key) {
    throw new Error(
      "OpenAI API Key가 설정되지 않았습니다. 명령어 팔레트에서 입력하세요."
    );
  }

  const client = new OpenAI({ apiKey: key });
  const prompt = prompts[0]; // 우선 첫 프롬프트만 사용 (필요시 개선)
  const chat = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", 
        content:
          "너는 GitHub Actions 로그 분석 도우미야. " +
          "사용자가 준 로그를 읽고 아래 JSON 형식으로만 답해:\n\n" +
          "{\n" +
          '  "summary": "로그 전체 요약",\n' +
          '  "rootCause": "실패의 핵심 원인",\n' +
          '  "suggestion": "해결 방법"\n' +
          "}\n\n" +
          "설명이나 불필요한 말은 하지마. 무조건 JSON만 출력해."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  return parseJsonLenient(raw);
  
}
