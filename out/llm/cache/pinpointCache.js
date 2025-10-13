"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinpointCache = void 0;
// src/llm/cache/pinpointCache.ts
const cache_1 = require("./cache");
/**
 * PinpointResult 전용 캐시 인스턴스
 * - 2차 코드 분석(second-pass) 결과를 저장함
 * - 내부 엔진은 cacheStore 기반
 */
exports.pinpointCache = (0, cache_1.createCache)();
