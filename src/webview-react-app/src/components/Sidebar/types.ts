export type ActionStatus = 'success' | 'failed' | 'running' | 'pending' | 'cancelled';

export interface Action {
  id: string;
  name: string;
  status: ActionStatus;
}