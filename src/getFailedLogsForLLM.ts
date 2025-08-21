// import { Octokit } from '@octokit/rest';
// import JSZip from 'jszip';
// import fetch from 'node-fetch';
// import * as fs from 'fs';
// import * as dotenv from 'dotenv';
// dotenv.config();

// const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// const owner = 'angkmfirefoxygal'; // getRepoInfo.ts에서 가져오기
// const repo = 'oss'; // getRepoInfo.ts에서 가져오기
// const run_id = 16265851475; // 실패한 run ID -> getFailedLogs 파일에서 가져오기

// async function main() {
//   const jobRes = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
//   const failedSteps = jobRes.data.jobs.flatMap(job =>
//   (job.steps ?? [])
//   .filter(s => s.conclusion === 'failure')
//   .map(s => s.name)
//   );
//   console.log('🛠️ 실패한 Step:', failedSteps);

//   // 로그 ZIP 다운로드 URL
//   const zipRes = await octokit.request(
//     'GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs',
//     { owner, repo, run_id, request: { redirect: 'manual' } }
//   );
//   const zipUrl = zipRes.headers.location!;
//   const zipBuffer = await (await fetch(zipUrl)).arrayBuffer();

//   const zip = await JSZip.loadAsync(zipBuffer);
//   const prompts: string[] = [];

//   for (const filename of Object.keys(zip.files)) {
//     const content = await zip.files[filename].async('string');
    
//     const snippet = extractErrorSnippet(content);
//     prompts.push(formatPrompt(filename, snippet)); 
//   }

//   fs.writeFileSync('llm_prompts.txt', prompts.join('\n\n---\n\n'));
//   console.log('✅ LLM 프롬프트 생성 완료 → llm_prompts.txt')
// }


// function extractErrorSnippet(text: string): string {
//   const lines = text.split('\n');
//   return lines.slice(-20).join('\n'); // 마지막 20줄만
// }``



// function formatPrompt(label: string, snippet: string): string {
//   return `너는 GitHub Actions 로그 분석 도우미야. 아래는 실패한 로그 파일 "${label}"의 내용이야. 실패 원인을 추론해서 설명해줘.\n\n\`\`\`\n${snippet}\n\`\`\``;
// }


// main();

