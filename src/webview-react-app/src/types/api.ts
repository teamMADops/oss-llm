

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

// GitHub Workflow Run 관련 타입
export interface WorkflowRun {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  timestamp: string;
  reason: string;
  branch?: string;
  workflow_id?: string;
  run_number?: number;
  html_url?: string;
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
""
