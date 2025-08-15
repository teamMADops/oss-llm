"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMResponses = getLLMResponses;
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const openai_1 = require("openai");
dotenv.config();
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function getLLMResponses() {
    const promptsPath = 'llm_prompts.txt';
    if (!fs.existsSync(promptsPath)) {
        throw new Error('llm_prompts.txt 파일이 없습니다. 먼저 생성해주세요.');
    }
    const prompts = fs.readFileSync(promptsPath, 'utf-8').split('\n\n---\n\n');
    const results = [];
    for (const [i, prompt] of prompts.entries()) {
        console.log(`📤 [${i + 1}]번째 프롬프트 전송 중...`);
        try {
            const chat = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: '너는 GitHub Actions 로그 분석 도우미야. 실패 이유를 명확히 설명해줘.',
                    },
                    { role: 'user', content: prompt },
                ],
            });
            const reply = chat.choices[0].message?.content ?? '';
            const stepMatch = prompt.match(/Step.+?"(.+?)"/);
            const step = stepMatch?.[1] ?? `Step ${i + 1}`;
            const fileMatch = prompt.match(/로그 파일 "(.+?)"/);
            const filename = fileMatch?.[1] ?? `unknown_${i + 1}.txt`;
            results.push({
                step,
                filename,
                prompt,
                response: reply,
            });
        }
        catch (err) {
            console.error(`❗ 오류 발생 (프롬프트 ${i + 1}):`, err);
        }
    }
    return results;
}
