// "use strict";
// var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
//     if (k2 === undefined) k2 = k;
//     var desc = Object.getOwnPropertyDescriptor(m, k);
//     if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
//       desc = { enumerable: true, get: function() { return m[k]; } };
//     }
//     Object.defineProperty(o, k2, desc);
// }) : (function(o, m, k, k2) {
//     if (k2 === undefined) k2 = k;
//     o[k2] = m[k];
// }));
// var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
//     Object.defineProperty(o, "default", { enumerable: true, value: v });
// }) : function(o, v) {
//     o["default"] = v;
// });
// var __importStar = (this && this.__importStar) || (function () {
//     var ownKeys = function(o) {
//         ownKeys = Object.getOwnPropertyNames || function (o) {
//             var ar = [];
//             for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
//             return ar;
//         };
//         return ownKeys(o);
//     };
//     return function (mod) {
//         if (mod && mod.__esModule) return mod;
//         var result = {};
//         if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
//         __setModuleDefault(result, mod);
//         return result;
//     };
// })();
// var __importDefault = (this && this.__importDefault) || function (mod) {
//     return (mod && mod.__esModule) ? mod : { "default": mod };
// };
// Object.defineProperty(exports, "__esModule", { value: true });
// const rest_1 = require("@octokit/rest");
// const jszip_1 = __importDefault(require("jszip"));
// const node_fetch_1 = __importDefault(require("node-fetch"));
// const fs = __importStar(require("fs"));
// const dotenv = __importStar(require("dotenv"));
// dotenv.config();
// const octokit = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
// const owner = 'angkmfirefoxygal';
// const repo = 'oss';
// const run_id = 16265851475; // 실패한 run ID
// async function main() {
//     const jobRes = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
//     const failedSteps = jobRes.data.jobs.flatMap(job => (job.steps ?? [])
//         .filter(s => s.conclusion === 'failure')
//         .map(s => s.name));
//     console.log('🛠️ 실패한 Step:', failedSteps);
//     // 로그 ZIP 다운로드 URL
//     const zipRes = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', { owner, repo, run_id, request: { redirect: 'manual' } });
//     const zipUrl = zipRes.headers.location;
//     const zipBuffer = await (await (0, node_fetch_1.default)(zipUrl)).arrayBuffer();
//     const zip = await jszip_1.default.loadAsync(zipBuffer);
//     const prompts = [];
//     for (const filename of Object.keys(zip.files)) {
//         const content = await zip.files[filename].async('string');
//         const snippet = extractErrorSnippet(content);
//         prompts.push(formatPrompt(filename, snippet));
//     }
//     fs.writeFileSync('llm_prompts.txt', prompts.join('\n\n---\n\n'));
//     console.log('✅ LLM 프롬프트 생성 완료 → llm_prompts.txt');
// }
// function extractErrorSnippet(text) {
//     const lines = text.split('\n');
//     return lines.slice(-20).join('\n'); // 마지막 20줄만
// }
// function formatPrompt(label, snippet) {
//     return `너는 GitHub Actions 로그 분석 도우미야. 아래는 실패한 로그 파일 "${label}"의 내용이야. 실패 원인을 추론해서 설명해줘.\n\n\`\`\`\n${snippet}\n\`\`\``;
// }
// main();
