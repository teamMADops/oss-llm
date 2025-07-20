import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
    const promptsPath = 'llm_prompts.txt';
    if (!fs.existsSync(promptsPath)) {
        console.error('llm_prompts.txt 파일이 없습니다. 먼저 생성해주세요.');
        return;
    }

    const prompts = fs.readFileSync(promptsPath, 'utf-8').split('\n\n---\n\n');

    for (const [i, prompt] of prompts.entries()) {
        console.log(`[${i + 1}]번째 프롬프트 전송 중...`);
        try {
            const chat = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '너는 GitHub Actions 로그 분석 도우미야. 실패 이유를 명확히 설명해줘.' },
                { role: 'user', content: prompt }
        ]
        });

        const reply = chat.choices[0].message?.content;
        console.log(`GPT 응답:\n${reply}\n`);
        console.log('==============================\n');

    } catch (err) {
        console.error(`오류 발생 (프롬프트 ${i + 1}):`, err);
    }
    } 
}

main();
