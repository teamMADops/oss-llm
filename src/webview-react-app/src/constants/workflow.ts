export const WORKFLOW_STATUSES = {
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

export const WORKFLOW_CONCLUSIONS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped'
} as const;
