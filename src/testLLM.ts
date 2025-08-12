import { getLLMResponses } from './sendPromptsToOpenAI';

async function runTest() {
    try {
        const results = await getLLMResponses();
        console.log('✅ 테스트 완료. LLM 응답 결과:');
        console.dir(results, { depth: null });
    } catch (err) {
        console.error('❌ 테스트 실패:', err);
    }
}

runTest();
