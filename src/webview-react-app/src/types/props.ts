export interface PageProps {
  actionId: string | null;
  isSidebarOpen: boolean;
}

export interface DashboardPageProps extends PageProps {
  runId: string | null;
  // TODO: 실제 `llmAnalysisResult` 타입으로 변경 필요
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  llmAnalysisResult: any; // In a real scenario, you'd have a type for LLMResult
}

export interface HistoryPageProps extends PageProps {
  onRunClick: (runId: string) => void;
}
