export type WorkflowStatus = 'queued' | 'in_progress' | 'completed';
export type WorkflowConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | null;

export interface BaseWorkflowRun {
  id: string;
  status: WorkflowStatus;
  conclusion: WorkflowConclusion;
  timestamp: string;
  author: string;
}

export interface WorkflowRun extends BaseWorkflowRun {
  reason: string;
  branch: string;
  commit: string;
}
