import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type LLMResult = { // 일단 json 객체 반환으로
    step: string;
    filename: string;
    prompt: string;
    response: string;
};

export async function getLLMResponses(): Promise<LLMResult[]> {
    const promptsPath = 'llm_prompts.txt';
    if (!fs.existsSync(promptsPath)) {
        throw new Error('llm_prompts.txt 파일이 없습니다. 먼저 생성해주세요.');
        
    }

    const prompts = fs.readFileSync(promptsPath, 'utf-8').split('\n\n---\n\n');
    const results: LLMResult[] = [];

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
    } catch (err) {
        console.error(`❗ 오류 발생 (프롬프트 ${i + 1}):`, err);
    }
    }

    return results;

}

