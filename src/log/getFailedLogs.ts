// src/log/getFailedLogs.ts
import { Octokit } from '@octokit/rest';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import { extractRelevantLog } from './extractRelevantLog';
import { formatPrompt } from './formatPrompt';
import * as fs from 'fs';
import * as path from 'path';

export async function getFailedStepsAndPrompts(
  octokit: Octokit,
  owner: string,
  repo: string,
  run_id: number,
  logMode: 'all' | 'error'= 'all'
): Promise<{ failedSteps: string[]; prompts: string[] }> {

  console.log(`[🐙] Octokit run_id 요청: ${run_id}`);
  console.log("[getFailedStepsAndPrompts] 요청 파라미터:", { owner, repo, run_id, logMode });

  const jobRes = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id });
  const failedSteps = jobRes.data.jobs.flatMap(job =>
    (job.steps ?? []).filter(s => s.conclusion === 'failure').map(s => s.name)
  );

  console.log(`[📦] 실패한 step ${failedSteps.length}개 추출됨`);

  const zipRes = await octokit.request(
    'GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs',
    { owner, repo, run_id, request: { redirect: 'manual' } }
  );
  const zipUrl = zipRes.headers.location!;
  console.log(`[⬇️] 로그 ZIP 다운로드 중: ${zipUrl}`);

  const zipBuffer = await (await fetch(zipUrl)).arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);

  const prompts: string[] = [];
  for (const filename of Object.keys(zip.files)) {
    const content = await zip.files[filename].async('string');
    const snippet = extractRelevantLog(content, logMode);
    prompts.push(formatPrompt(filename, snippet)); // formatPrompt.ts 에서 프롬프트 초안 수정하기 
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
