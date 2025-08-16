"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedStepsAndPrompts = getFailedStepsAndPrompts;
const jszip_1 = __importDefault(require("jszip"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const extractRelevantLog_1 = require("./extractRelevantLog");
const formatPrompt_1 = require("./formatPrompt");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function getFailedStepsAndPrompts(octokit, owner, repo, run_id, logMode = 'all') {
    console.log(`[🐙] Octokit run_id 요청: ${run_id}`);
    console.log("[getFailedStepsAndPrompts] 요청 파라미터:", { owner, repo, run_id, logMode });
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
        prompts.push((0, formatPrompt_1.formatPrompt)(filename, snippet)); // formatPrompt.ts 에서 프롬프트 초안 수정하기 
    }
    // 일단 txt 파일 생성하는 코드 -> 경로 지정
    const savePath = path.resolve(process.cwd(), 'llm_prompts.txt');
    fs.writeFileSync(savePath, prompts.join('\n\n---\n\n'), 'utf-8');
    console.log("📂 process.cwd():", process.cwd());
    // 저장 확인 로그
    const stats = fs.statSync(savePath);
    console.log(`💾 프롬프트 저장 완료 → ${savePath} (크기: ${stats.size} bytes)`);
    console.log(`[💾] prompts 저장 완료: ${savePath}`);
    console.log(`[🧠] 프롬프트 ${prompts.length}개 생성 완료`);
    return { failedSteps, prompts };
}
