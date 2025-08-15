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
            { role: "system", content: "너는 GitHub Actions 로그 분석 도우미야. 실패 이유를 명확히 설명해줘." },
            { role: "user", content: prompt }
        ]
    });
    const reply = chat.choices[0].message?.content ?? "";
    // 첫 버전: 문자열 전체를 summary에 담기
    return { summary: reply, rootCause: "", suggestion: "" };
}
