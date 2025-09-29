// src/llm/types.ts
export type LLMKeyError = {
  line?: number;    // 로그 내 라인(추정)
  snippet?: string; // 해당 라인 또는 주변 발췌
  note?: string;    // 왜 중요한지
};

export type LLMResult = {
  summary: string;      // 전체 요약
  rootCause: string;    // 실패의 핵심 원인(한 문장)
  suggestion: string;   // 구체적 해결 방법

  // 선택
  failureType?: string;   // dependency | network | tooling | permissions | config | test | infra
  confidence?: number;    // 0~1 신뢰도
  affectedStep?: string;  // 분석 대상 스텝명(있으면)
  filename?: string;      // 분석 대상 파일명(있으면)
  keyErrors?: LLMKeyError[]; // 근거 라인/스니펫/메모
};
