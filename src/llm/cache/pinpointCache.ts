// src/llm/cache/pinpointCache.ts
import { createCache } from "./cache";
import type { PinpointResult } from "../types/types";

/**
 * PinpointResult 전용 캐시 인스턴스
 * - 2차 코드 분석(second-pass) 결과를 저장함
 * - 내부 엔진은 cacheStore 기반
 */
export const pinpointCache = createCache<PinpointResult>();
