"use strict";
// src/log/formatPrompt.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPrompt = formatPrompt;
function formatPrompt(label, snippet) {
    return `너는 GitHub Actions 로그 분석 도우미야. 아래는 실패한 로그 파일 "${label}"의 내용이야. 실패 원인을 추론해서 설명해줘.\n\n\`\`\`\n${snippet}\n\`\`\``;
}
