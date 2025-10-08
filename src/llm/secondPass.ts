import { OpenAI } from "openai";
import * as vscode from "vscode";
import { buildSecondPassPrompt } from "./prompts";
import type { SecondPassInput, PinpointResult } from "./types";

export async function analyzeSecondPass(
  context: vscode.ExtensionContext,
  input: SecondPassInput
): Promise<PinpointResult> {
  const key = await context.secrets.get("openaiApiKey");
  if (!key) throw new Error("OpenAI API Key가 설정되지 않았습니다.");

  const client = new OpenAI({ apiKey: key });
  const userPrompt = buildSecondPassPrompt(input);

  const chat = await client.chat.completions.create({
    model: "gpt-3.5-turbo", 
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "너는 GitHub Actions 실패 원인 분석을 돕는 코드 전문가입니다.",
          "입력된 로그와 코드 윈도우를 기반으로 수정 지점과 권장 패치를 JSON으로만 출력하세요.",
          "",
          "형식 지침:",
          "- 출력은 오직 JSON입니다. 마크다운/설명/코드펜스 금지.",
          "- JSON 키: file, startLine, endLine, unifiedDiff, checklist, confidence.",
          "- checklist는 ['~하세요', '~입니다'] 문장 형태 배열.",
          "- chain-of-thought 절대 노출 금지.",
        ].join("\n"),
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = chat.choices[0].message?.content ?? "{}";
  try {
    const parsed = JSON.parse(
      raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim()
    ) as PinpointResult;
    return parsed;
  } catch {
    return {
      file: input.path,
      unifiedDiff: "",
      checklist: ["응답을 JSON으로 해석할 수 없습니다."],
      confidence: 0.0,
    };
  }
}
