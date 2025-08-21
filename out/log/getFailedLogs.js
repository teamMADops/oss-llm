"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedStepsAndPrompts = getFailedStepsAndPrompts;
const jszip_1 = __importDefault(require("jszip"));
const extractRelevantLog_1 = require("./extractRelevantLog");
const formatPrompt_1 = require("./formatPrompt");
async function getFailedStepsAndPrompts(octokit, owner, repo, run_id, logMode = 'all') {
    // 1) 실패 스텝 이름 수집
    const jobs = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
    const failedSteps = jobs.data.jobs.flatMap(job => (job.steps ?? []).filter(s => s.conclusion === 'failure').map(s => s.name ?? 'unknown'));
    // 2) 로그 ZIP 다운로드 (ArrayBuffer)
    const zipRes = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', { owner, repo, run_id, request: { responseType: 'arraybuffer' } });
    const zip = await jszip_1.default.loadAsync(zipRes.data);
    // 3) 파일별로 내용 읽어서 prompt 구성
    const prompts = [];
    const txtFiles = Object.values(zip.files).filter(f => !f.dir && f.name.endsWith('.txt'));
    // 간단 매칭: 스텝명이 파일명에 포함되면 우선 사용
    const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
    const failedNorm = failedSteps.map(norm);
    for (const f of txtFiles) {
        const raw = await f.async('string');
        const snippet = (0, extractRelevantLog_1.extractRelevantLog)(raw, logMode);
        const matchedStep = failedSteps.find((s, i) => f.name.toLowerCase().includes(failedNorm[i]));
        const prompt = (0, formatPrompt_1.formatPrompt)({
            stepName: matchedStep,
            filename: f.name,
            logSnippet: snippet
        });
        prompts.push(prompt);
    }
    // 실패 스텝이 아예 없으면(취소/중단 등) 최소 1개 프롬프트는 유지
    if (prompts.length === 0 && txtFiles.length > 0) {
        const f = txtFiles[0];
        const raw = await f.async('string');
        const snippet = (0, extractRelevantLog_1.extractRelevantLog)(raw, logMode);
        prompts.push((0, formatPrompt_1.formatPrompt)({ filename: f.name, logSnippet: snippet }));
    }
    return { failedSteps, prompts };
}
