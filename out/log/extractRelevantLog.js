"use strict";
// src/log/extractRelevantLog.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRelevantLog = extractRelevantLog;
function extractRelevantLog(text, mode = 'tail') {
    const lines = text.split('\n');
    if (mode === 'all') {
        console.log('[📄] 전체 로그 사용');
        return text;
    }
    const errorLines = lines.filter(line => line.toLowerCase().includes('error') || line.includes('##[error]'));
    console.log(`[📄] 에러 메시지 추출 (${errorLines.length}줄)`);
    return errorLines.join('\n');
}
