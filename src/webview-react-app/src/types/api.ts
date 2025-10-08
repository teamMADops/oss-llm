import type { WorkflowStatus, WorkflowConclusion, BaseWorkflowRun, WorkflowRun } from './common';

export type { WorkflowStatus, WorkflowConclusion, BaseWorkflowRun, WorkflowRun };

// VS Code API 메시지 타입
export interface VSCodeMessage {
  command: string;
  payload?: unknown;
}

// VS Code API 타입
export interface VSCodeAPI {
  postMessage: (message: VSCodeMessage) => void;
}

// GitHub Action 관련 타입
export type ActionStatus = 'success' | 'failed' | 'running' | 'pending' | 'cancelled';

export interface Action {
  id: string;
  name: string;
  status: ActionStatus;
}

// 최신 실행 정보 타입
export interface LatestRun {
  id: string;
  status: string;
  conclusion: string | null;
  timestamp: string;
  reason: string;
  detailedLog?: string;
  llmAnalysis?: string;
}

// LLM 분석 결과 타입
export interface LLMAnalysisResult {
  summary: string;
  rootCause?: string;
  suggestion?: string;
  items: {
    step: string;
    filename?: string;
    reason: string;
    fix?: string;
  }[];
}
