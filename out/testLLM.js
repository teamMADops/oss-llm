"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendPromptsToOpenAI_1 = require("./sendPromptsToOpenAI");
async function runTest() {
    try {
        const results = await (0, sendPromptsToOpenAI_1.getLLMResponses)();
        console.log('✅ 테스트 완료. LLM 응답 결과:');
        console.dir(results, { depth: null });
    }
    catch (err) {
        console.error('❌ 테스트 실패:', err);
    }
}
runTest();
