import { Octokit } from "@octokit/rest";

export async function dispatchWorkflow(
  octokit: Octokit, owner: string, repo: string, filename: string, ref: string, inputs?: Record<string,any>
){
  await octokit.actions.createWorkflowDispatch({ owner, repo, workflow_id: filename, ref, inputs });
  const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 1 });
  const run = data.workflow_runs?.[0];
  return { runId: run?.id!, runUrl: run?.html_url! };
}

export async function pollUntilDone(
  octokit: Octokit, owner: string, repo: string, runId: number, onTick?: (m:string)=>void
){
  while (true) {
    const { data } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
    onTick?.(`status=${data.status} / conclusion=${data.conclusion ?? "-"}`);
    if (data.status === "completed") return data.conclusion ?? "failure";
    await new Promise(r => setTimeout(r, 3500));
  }
}
