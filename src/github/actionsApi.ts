import { Octokit } from '@octokit/rest';
export type RepoRef = { owner: string; repo: string };

export type WorkflowSummary = {
  id: number; name: string; path: string; state: 'active'|'deleted'
};

export type WorkflowRunSummary = {
  id: number; run_number?: number; event: string;
  status?: string; conclusion?: string;
  head_branch?: string; created_at?: string; updated_at?: string;
  run_started_at?: string; actor?: { login: string; avatar_url?: string };
  head_sha?: string;
};

export function makeOctokit(token: string) {
  return new Octokit({ auth: token, userAgent: 'oss-actions-viewer' });
}

export async function listWorkflows(kit: Octokit, repo: RepoRef): Promise<WorkflowSummary[]> {
  const r = await kit.actions.listRepoWorkflows({ owner: repo.owner, repo: repo.repo, per_page: 100 });
  return r.data.workflows.map(w => ({
    id: w.id!, name: w.name!, path: w.path!, state: (w.state as any) ?? 'active'
  }));
}

export async function listWorkflowRuns(kit: Octokit, repo: RepoRef, workflow_id: number, page=1, perPage=20) {
  const r = await kit.actions.listWorkflowRuns({ owner: repo.owner, repo: repo.repo, workflow_id, page, per_page: perPage });
  return {
    total: r.data.total_count,
    runs: r.data.workflow_runs.map(v => ({
      id: v.id!, run_number: v.run_number, event: v.event,
      status: v.status, conclusion: v.conclusion,
      head_branch: v.head_branch, created_at: v.created_at, updated_at: v.updated_at,
      run_started_at: (v as any).run_started_at, // 필드 존재 시
      actor: v.actor ? { login: v.actor.login, avatar_url: v.actor.avatar_url! } : undefined,
      head_sha: v.head_sha
    })) as WorkflowRunSummary[]
  };
}

export async function getRunMeta(kit: Octokit, repo: RepoRef, run_id: number) {
  return (await kit.actions.getWorkflowRun({ owner: repo.owner, repo: repo.repo, run_id })).data;
}

export async function listJobsMeta(kit: Octokit, repo: RepoRef, run_id: number) {
  const r = await kit.actions.listJobsForWorkflowRun({ owner: repo.owner, repo: repo.repo, run_id, per_page: 100 });
  return r.data.jobs.map(j => ({
    id: j.id, name: j.name, status: j.status, conclusion: j.conclusion,
    started_at: j.started_at, completed_at: j.completed_at,
    steps: (j.steps ?? []).map(s => ({ name: s.name, status: s.status, conclusion: s.conclusion }))
  }));
}
