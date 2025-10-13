"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokens = estimateTokens;
exports.stripAnsi = stripAnsi;
exports.extractErrorLines = extractErrorLines;
exports.tailLines = tailLines;
exports.preprocessLogForLLM = preprocessLogForLLM;
// src/llm/logPreprocess.ts
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function stripAnsi(text) {
    // 터미널 색상/제어코드 제거
    return text.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g, "");
}
function extractErrorLines(text) {
    const lines = text.split(/\r?\n/);
    const re = /(error|failed|fail|exception|traceback|cannot|fatal|segmentation fault)/i;
    const picked = lines.filter(l => re.test(l));
    // 에러 라인이 전혀 없으면 원문 반환해서 다음 단계(tail)로 넘김
    return picked.length ? picked.join("\n") : text;
}
function tailLines(text, n = 500) {
    const lines = text.split(/\r?\n/);
    return lines.slice(-n).join("\n");
}
function preprocessLogForLLM(raw, opts) {
    const { maxTokens = 16000, safetyMargin = 1000, // system+guide 여유
    tailCount = 600, maxCharsHard = 120000, // 비상 하드컷
     } = opts || {};
    let text = stripAnsi(raw);
    const limit = Math.max(1000, maxTokens - safetyMargin);
    if (estimateTokens(text) > limit) {
        const onlyErrors = extractErrorLines(text);
        text = estimateTokens(onlyErrors) <= limit ? onlyErrors : tailLines(onlyErrors, tailCount);
    }
    if (estimateTokens(text) > limit) {
        text = tailLines(text, tailCount);
    }
    if (text.length > maxCharsHard) {
        text = text.slice(-maxCharsHard);
    }
    return text;
}
