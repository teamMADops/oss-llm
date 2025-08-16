"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePrompts = analyzePrompts;
const openai_1 = require("openai");
async function analyzePrompts(prompts) {
    const client = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = prompts[0]; // 우선 첫 프롬프트만 사용 (필요시 개선)
    const chat = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system",
                content: "너는 GitHub Actions 로그 분석 도우미야. " +
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
    let parsed = { summary: "", rootCause: "", suggestion: "" };
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        // 혹시 JSON 파싱 실패하면 summary에 원본 내용 담아두기
        parsed.summary = raw;
    }
    return parsed;
}
