// src/llm/types.ts
export type LLMKeyError = {
  line?: number;    // 로그 내 라인(추정)
  snippet?: string; // 해당 라인 또는 주변 발췌
  note?: string;    // 왜 중요한지
};

export type FailureType =
  | "dependency" | "network" | "tooling" | "permissions" | "config" | "test" | "infra";

// 로그 1차 분석 결과 구조
export type LLMResult = {
  summary: string;      // 전체 요약
  rootCause: string;    // 실패의 핵심 원인(한 문장)
  suggestion: string;   // 구체적 해결 방법

  failureType?: FailureType;   // dependency | network | tooling | permissions | config | test | infra
  confidence?: number;    // 0~1 신뢰도
  affectedStep?: string;  // 분석 대상 스텝명(있으면)
  filename?: string;      // 분석 대상 파일명(있으면)
  keyErrors?: LLMKeyError[]; // 근거 라인/스니펫/메모

  suspectedPaths?: SuspectedPath[];
};

// UI에 보여질 의심 경로 정보 → 택 1 해서 2차 LLM 분석 
export type SuspectedPath = {
  path: string;        // repo 상대 경로
  reason: string;      // 왜 후보인지(매칭된 로그 라인 요약)
  score?: number;      // 0~1 가중치
  lineHint?: number;   // 의심 라인 번호(있으면)
  logExcerpt?: string; // 로그 발췌(해당 근처 N줄)
};

// 2차 분석 입력 : UI 에 전달하지 말기
export type SecondPassInput = {
  path: string;             // 문제 파일 경로
  logExcerpt: string;       // 실패 로그 발췌
  codeWindow: string;       // 의심 라인 주변 ±N줄 코드
  lineHint?: number;        // 중심 라인(있으면)
  context?: {               // 선택적 메타데이터
    workflow?: string;      // CI 워크플로우 이름
    step?: string;          // 실패 스텝 이름
  };
};

// 2차 분석 결과 : UI 에 보여주기
export type PinpointResult = {
  file: string;          // 문제 파일
  startLine?: number;    // 수정 시작 라인
  endLine?: number;      // 수정 끝 라인
  unifiedDiff?: string;  // ---/+++/@@ 포함 diff
  checklist?: string[];  // PR 전 수동 확인 항목
  confidence?: number;   // 신뢰도 0~1
};
