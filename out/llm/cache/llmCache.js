"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmCache = void 0;
const cache_1 = require("./cache");
/**
 * LLM 전용 캐시 인스턴스
 * - 1차 로그 분석(analyzePrompts) 결과 저장용
 */
exports.llmCache = (0, cache_1.createCache)();
