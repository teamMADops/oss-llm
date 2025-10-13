"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSecondPass = analyzeSecondPass;
const openai_1 = require("openai");
const systemPrompts_1 = require("./prompts/systemPrompts");
const prompts_1 = require("./prompts/prompts");
const pinpointCache_1 = require("./cache/pinpointCache");
async function analyzeSecondPass(context, input) {
    const key = await context.secrets.get("openaiApiKey");
    if (!key)
        throw new Error("OpenAI API Key가 설정되지 않았습니다.");
    const client = new openai_1.OpenAI({ apiKey: key });
    const userPrompt = (0, prompts_1.buildSecondPassPrompt)(input);
    const cacheKey = {
        namespace: "second-pass",
        model: "gpt-3.5-turbo",
        systemPromptVersion: "sp-2025-10-12",
        prompt: userPrompt,
        ttlMs: 6 * 60 * 60 * 1000, // 6시간
    };
    const parsed = await pinpointCache_1.pinpointCache.getOrCompute(cacheKey, async () => {
        const chat = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            temperature: 0,
            messages: [
                systemPrompts_1.SYSTEM_PROMPTS.SECOND_PASS,
                { role: "user", content: userPrompt },
            ],
        });
        const raw = chat.choices[0].message?.content ?? "{}";
        let result;
        try {
            result = JSON.parse(raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim());
        }
        catch {
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
