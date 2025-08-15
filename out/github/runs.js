"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchWorkflow = dispatchWorkflow;
exports.pollUntilDone = pollUntilDone;
async function dispatchWorkflow(octokit, owner, repo, filename, ref, inputs) {
    await octokit.actions.createWorkflowDispatch({ owner, repo, workflow_id: filename, ref, inputs });
    const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 1 });
    const run = data.workflow_runs?.[0];
    return { runId: run?.id, runUrl: run?.html_url };
}
async function pollUntilDone(octokit, owner, repo, runId, onTick) {
    while (true) {
        const { data } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
        onTick?.(`status=${data.status} / conclusion=${data.conclusion ?? "-"}`);
        if (data.status === "completed")
            return data.conclusion ?? "failure";
        await new Promise(r => setTimeout(r, 3500));
    }
}
