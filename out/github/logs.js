"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedStepsAndPrompts = getFailedStepsAndPrompts;
const jszip_1 = __importDefault(require("jszip"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function getFailedStepsAndPrompts(octokit, owner, repo, run_id, mode) {
    const jobRes = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
    const failedSteps = jobRes.data.jobs.flatMap(job => (job.steps ?? []).filter(s => s.conclusion === "failure").map(s => s.name));
    const zipRes = await octokit.request("GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs", { owner, repo, run_id, request: { redirect: "manual" } });
    const zipUrl = zipRes.headers.location;
    const zipBuffer = await (await (0, node_fetch_1.default)(zipUrl)).arrayBuffer();
    const zip = await jszip_1.default.loadAsync(zipBuffer);
    const prompts = [];
    for (const filename of Object.keys(zip.files)) {
        const content = await zip.files[filename].async("string");
        const snippet = mode === "all" ? content : extractErrorSnippet(content);
        prompts.push(formatPrompt(filename, snippet));
    }
    return { failedSteps, prompts };
}
function extractErrorSnippet(text) {
    const lines = text.split("\n");
    return lines.slice(-20).join("\n"); // 단순 버전
}
function formatPrompt(label, snippet) {
    return `너는 GitHub Actions 로그 분석 도우미야. 아래는 실패한 로그 파일 "${label}"의 내용이야. 실패 원인을 추론해서 설명해줘.\n\n\`\`\`\n${snippet}\n\`\`\``;
}
