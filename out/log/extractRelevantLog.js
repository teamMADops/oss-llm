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
    const sliced = lines.slice(-20).join('\n');
    console.log(`[📄] 마지막 20줄 추출 (${lines.length}줄 중)`);
    return sliced;
}
