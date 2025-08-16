"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOctokit = makeOctokit;
exports.listWorkflows = listWorkflows;
exports.listWorkflowRuns = listWorkflowRuns;
exports.getRunMeta = getRunMeta;
exports.listJobsMeta = listJobsMeta;
const rest_1 = require("@octokit/rest");
function makeOctokit(token) {
    return new rest_1.Octokit({ auth: token, userAgent: 'oss-actions-viewer' });
}
async function listWorkflows(kit, repo) {
    const r = await kit.actions.listRepoWorkflows({ owner: repo.owner, repo: repo.repo, per_page: 100 });
    return r.data.workflows.map(w => ({
        id: w.id, name: w.name, path: w.path, state: w.state ?? 'active'
    }));
}
async function listWorkflowRuns(kit, repo, workflow_id, page = 1, perPage = 20) {
    const r = await kit.actions.listWorkflowRuns({ owner: repo.owner, repo: repo.repo, workflow_id, page, per_page: perPage });
    return {
        total: r.data.total_count,
        runs: r.data.workflow_runs.map(v => ({
            id: v.id, run_number: v.run_number, event: v.event,
            status: v.status, conclusion: v.conclusion,
            head_branch: v.head_branch, created_at: v.created_at, updated_at: v.updated_at,
            run_started_at: v.run_started_at, // 필드 존재 시
            actor: v.actor ? { login: v.actor.login, avatar_url: v.actor.avatar_url } : undefined,
            head_sha: v.head_sha
        }))
    };
}
async function getRunMeta(kit, repo, run_id) {
    return (await kit.actions.getWorkflowRun({ owner: repo.owner, repo: repo.repo, run_id })).data;
}
async function listJobsMeta(kit, repo, run_id) {
    const r = await kit.actions.listJobsForWorkflowRun({ owner: repo.owner, repo: repo.repo, run_id, per_page: 100 });
    return r.data.jobs.map(j => ({
        id: j.id, name: j.name, status: j.status, conclusion: j.conclusion,
        started_at: j.started_at, completed_at: j.completed_at,
        steps: (j.steps ?? []).map(s => ({ name: s.name, status: s.status, conclusion: s.conclusion }))
    }));
}
