import { createCache } from "./cache";
import type { LLMResult } from "../types";

/**
 * LLM 전용 캐시 인스턴스
 * - 1차 로그 분석(analyzePrompts) 결과 저장용
 */
export const llmCache = createCache<LLMResult>();
