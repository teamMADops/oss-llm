"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedStepsAndPrompts = getFailedStepsAndPrompts;
const jszip_1 = __importDefault(require("jszip"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const extractRelevantLog_1 = require("./extractRelevantLog");
const formatPrompt_1 = require("./formatPrompt");
async function getFailedStepsAndPrompts(octokit, owner, repo, run_id, logMode = 'tail') {
    console.log(`[🐙] Octokit run_id 요청: ${run_id}`);
    const jobRes = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
    const failedSteps = jobRes.data.jobs.flatMap(job => (job.steps ?? []).filter(s => s.conclusion === 'failure').map(s => s.name));
    console.log(`[📦] 실패한 step ${failedSteps.length}개 추출됨`);
    const zipRes = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', { owner, repo, run_id, request: { redirect: 'manual' } });
    const zipUrl = zipRes.headers.location;
    console.log(`[⬇️] 로그 ZIP 다운로드 중: ${zipUrl}`);
    const zipBuffer = await (await (0, node_fetch_1.default)(zipUrl)).arrayBuffer();
    const zip = await jszip_1.default.loadAsync(zipBuffer);
    const prompts = [];
    for (const filename of Object.keys(zip.files)) {
        const content = await zip.files[filename].async('string');
        const snippet = (0, extractRelevantLog_1.extractRelevantLog)(content, logMode);
        prompts.push((0, formatPrompt_1.formatPrompt)(filename, snippet));
    }
    console.log(`[🧠] 프롬프트 ${prompts.length}개 생성 완료`);
    return { failedSteps, prompts };
}
