import * as vscode from 'vscode';
import * as path from 'path';

import { getSavedRepo, promptAndSaveRepo,deleteSavedRepo, type RepoRef} from './github/getRepoInfo';
import { getOctokitViaVSCodeAuth } from './auth/githubSession';

import { getRunIdFromQuickPick } from './github/getRunList';
import { printToOutput } from './output/printToOutput';       

import { getFailedStepsAndPrompts } from './log/getFailedLogs';
import { analyzePrompts } from './llm/analyze';
import * as fs from 'fs';


import * as dotenv from "dotenv";
dotenv.config();

// Webview panel management - Keep track of panels to prevent duplicates
const panels: { [key: string]: vscode.WebviewPanel } = {};
// 맨 위 유틸 추가: 숫자 여부 체크
const isNumeric = (s: any) => typeof s === 'string' && /^\d+$/.test(s);

/**
 * Creates and shows a new webview panel, or reveals an existing one.
 * Manages panel lifecycle and communication between the extension and the webview.
 * @param context The extension context.
 * @param page The page to display in the webview ('dashboard', 'editor', 'history').
 */
function createAndShowWebview(context: vscode.ExtensionContext, page: 'dashboard' | 'editor' | 'history') {
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

    const pageTitle = `MAD Ops: ${page.charAt(0).toUpperCase() + page.slice(1)}`;

    // If we already have a panel for this page, show it.
    if (panels[page]) {
        panels[page].reveal(column);
        // Also send a message to ensure the correct page is displayed, in case the user changed it.
        panels[page].webview.postMessage({ command: 'changePage', page });
        return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
        page, // This is the viewType, used internally to identify the panel type
        pageTitle, // This is the title displayed to the user
        column || vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true, // Keep the state of the webview even when it's not visible
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview-build'))]
        }
    );

    panel.webview.html = getWebviewContent(context, panel);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async message => {
            
          //github auto auth-login
            const octokit = await getOctokitViaVSCodeAuth();
            if (!octokit) {
            vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
            return;
            }
            console.log('[3] 🔑 VS Code GitHub 세션 확보');

            // All messages from the webview will be handled here.
            // This is where the API layer described in structure.md is implemented on the extension side.
            const repo = await getSavedRepo(context);
            if (!repo) {
                panel.webview.postMessage({ command: 'error', payload: 'GitHub 리포지토리 정보를 찾을 수 없습니다.' });
                return;
            }

            switch (message.command) {
                // These are placeholders for the API calls defined in structure.md
                case 'getActions':
                    try {
                        // GitHub 워크플로우 파일 목록 가져오기
                        const { data: workflows } = await octokit.actions.listRepoWorkflows({
                            owner: repo.owner,
                            repo: repo.repo
                        });
                        
                        console.log(`[📋] 워크플로우 개수: ${workflows.workflows.length}`);
                        
                        if (workflows.workflows.length === 0) {
                            console.log('[⚠️] 워크플로우 파일이 없습니다.');
                            panel.webview.postMessage({ 
                                command: 'getActionsResponse', 
                                payload: [] 
                            });
                            return;
                        }
                        

                        // ✅ 경로 기반 키 사용 (경로가 없으면 id 문자열 fallback)
                        const actions = (workflows.workflows ?? []).map(w => {
                          const key = w.path || String(w.id);
                          return {
                            // 프론트에서 기존 필드명(actionId)을 그대로 쓰되, 값은 "경로"로 보냄
                            actionId: key,
                            id: String(w.id),        // 참고용
                            path: w.path ?? null,    // 참고용
                            name: w.name ?? key,
                            status: w.state === 'active' ? 'success' : 'failed'
                          };
                        });
                        
                        console.log(`[✅] 워크플로우 목록:`, actions);
                        
                        panel.webview.postMessage({ 
                            command: 'getActionsResponse', 
                            payload: actions 
                        });
                    } catch (error) {
                        console.error('Error fetching actions:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: '워크플로우 목록을 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                    
                case 'getLatestRun':
                    try {
                        const actionId = message.payload?.actionId;
                        if (!actionId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Action ID가 필요합니다.' 
                            });
                            return;
                        }
                        
                        // ✅ 경로 또는 숫자 id 모두 허용
                        const workflowIdOrPath = String(actionId);

                        // 특정 워크플로우의 최신 실행 가져오기
                        const { data: runs } = await octokit.actions.listWorkflowRuns({
                            owner: repo.owner,
                            repo: repo.repo,
                            // GitHub API는 문자열 경로('.github/workflows/ci.yml') 또는 숫자 id 모두 허용
                            workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : (workflowIdOrPath as any),
                            per_page: 1
                        });
                        
                        if (runs.workflow_runs.length > 0) {
                            const run = runs.workflow_runs[0];
                            const latestRun = {
                                id: run.id.toString(),
                                status: run.status,
                                conclusion: run.conclusion || 'unknown',
                                timestamp: run.created_at,
                                reason: run.head_commit?.message || 'Unknown'
                            };
                            
                            panel.webview.postMessage({ 
                                command: 'getLatestRunResponse', 
                                payload: latestRun 
                            });
                        } else {
                            panel.webview.postMessage({ 
                                command: 'getLatestRunResponse', 
                                payload: null 
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching latest run:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: '최신 실행 정보를 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                    
                case 'getRunHistory':
                    try {
                        const actionId = message.payload?.actionId;
                        if (!actionId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Action ID가 필요합니다.' 
                            });
                            return;
                        }
                        
                        const workflowIdOrPath = String(actionId); // ← 그대로 사용
                        console.log(`[🔍] 워크플로우 ${workflowIdOrPath} 실행 기록 조회 (owner=${repo.owner}, repo=${repo.repo})`);

                        // 특정 워크플로우의 실행 기록 가져오기
                        const { data: runs } = await octokit.actions.listWorkflowRuns({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : (workflowIdOrPath as any),
                            per_page: 10
                        });
                        
                        console.log(`[📊] 실행 기록 개수: ${runs.workflow_runs.length}`);
                        
                        const runHistory = runs.workflow_runs.map(run => ({
                            id: run.id.toString(),
                            status: run.status,
                            conclusion: run.conclusion || 'unknown',
                            timestamp: run.created_at,
                            reason: run.head_commit?.message || 'Unknown',
                            branch: run.head_branch,
                            commit: run.head_sha?.substring(0, 7) || 'Unknown',
                            author: run.head_commit?.author?.name || 'Unknown'
                        }));
                        
                        panel.webview.postMessage({ 
                            command: 'getRunHistoryResponse', 
                            payload: runHistory 
                        });
                    } catch (error) {
                        console.error('Error fetching run history:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: '실행 기록을 가져오는데 실패했습니다.' 
                        });
                                        }
                    break;
                    
                case 'getLatestRunFromAllActions':
                    try {
                        console.log(`[🔍] 모든 actions 중 가장 최근 run 조회 (owner=${repo.owner}, repo=${repo.repo})`);
                        
                        // 모든 워크플로우 가져오기
                        const { data: workflows } = await octokit.actions.listRepoWorkflows({
                            owner: repo.owner,
                            repo: repo.repo
                        });
                        
                        let latestRun = null;
                        let latestTimestamp = 0;
                        
                        // 각 워크플로우의 최신 실행을 확인
                        for (const workflow of workflows.workflows) {
                            try {
                                const { data: runs } = await octokit.actions.listWorkflowRuns({
                                    owner: repo.owner,
                                    repo: repo.repo,
                                    workflow_id: workflow.id,
                                    per_page: 1
                                });
                                
                                if (runs.workflow_runs.length > 0) {
                                    const run = runs.workflow_runs[0];
                                    const runTimestamp = new Date(run.created_at).getTime();
                                    
                                    if (runTimestamp > latestTimestamp) {
                                        latestTimestamp = runTimestamp;
                                        latestRun = {
                                            id: run.id.toString(),
                                            status: run.status,
                                            conclusion: run.conclusion,
                                            timestamp: run.created_at,
                                            reason: run.head_commit?.message || 'Unknown',
                                            actionId: workflow.path || workflow.id.toString()
                                        };
                                    }
                                }
                            } catch (workflowError) {
                                console.log(`워크플로우 ${workflow.id} 실행 기록 조회 실패:`, workflowError);
                            }
                        }
                        
                        console.log(`[✅] 가장 최근 run:`, latestRun);
                        
                        panel.webview.postMessage({ 
                            command: 'getLatestRunFromAllActionsResponse', 
                            payload: latestRun 
                        });
                    } catch (error) {
                        console.error('Error fetching latest run from all actions:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: '가장 최근 실행 정보를 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                    
                case 'getRunDetails':
                    try {
                        const runId = message.payload?.runId;
                        if (!runId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Run ID가 필요합니다.' 
                            });
                            return;
                        }
                        
                        console.log(`[🔍] Run 상세 정보 조회: ${runId} (owner=${repo.owner}, repo=${repo.repo})`);
                        
                        // 특정 run의 상세 정보 가져오기
                        const { data: run } = await octokit.actions.getWorkflowRun({
                            owner: repo.owner,
                            repo: repo.repo,
                            run_id: Number(runId)
                        });
                        
                        // Run의 jobs 정보도 가져오기
                        const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
                            owner: repo.owner,
                            repo: repo.repo,
                            run_id: Number(runId)
                        });
                        
                        const runDetails = {
                            id: run.id.toString(),
                            status: run.status,
                            conclusion: run.conclusion,
                            timestamp: run.created_at,
                            reason: run.head_commit?.message || 'Unknown',
                            branch: run.head_branch || 'Unknown',
                            workflow: run.name || 'Unknown',
                            runNumber: run.run_number,
                            duration: 'Unknown', // GitHub API에서 duration을 직접 제공하지 않음
                            commit: run.head_sha?.substring(0, 7) || 'Unknown',
                            author: run.head_commit?.author?.name || 'Unknown',
                            jobs: jobs.jobs
                        };
                        
                        console.log(`[✅] Run 상세 정보:`, runDetails);
                        
                        panel.webview.postMessage({ 
                            command: 'getRunDetailsResponse', 
                            payload: runDetails 
                        });
                    } catch (error) {
                        console.error('Error fetching run details:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: 'Run 상세 정보를 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                    
                case 'getRunLogs':
                    try {
                        const runId = message.payload?.runId;
                        if (!runId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Run ID가 필요합니다.' 
                            });
                            return;
                        }
                        
                        console.log(`[🔍] Run 로그 다운로드: ${runId} (owner=${repo.owner}, repo=${repo.repo})`);
                        
                        // Run의 로그 ZIP 다운로드
                        const { data: logs } = await octokit.request(
                            'GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs',
                            { 
                                owner: repo.owner, 
                                repo: repo.repo, 
                                run_id: Number(runId),
                                request: { responseType: 'arraybuffer' as any } 
                            }
                        );
                        
                        // ZIP 파일을 파싱하여 로그 내용 추출
                        const JSZip = require('jszip');
                        const zip = await JSZip.loadAsync(logs);
                        
                        let allLogs = '';
                        const txtFiles = Object.values(zip.files).filter((f: any) => !f.dir && f.name.endsWith('.txt'));
                        
                        for (const file of txtFiles) {
                            const content = await (file as any).async('string');
                            allLogs += `=== ${(file as any).name} ===\n${content}\n\n`;
                        }
                        
                        console.log(`[✅] Run 로그 다운로드 완료: ${txtFiles.length}개 파일`);
                        
                        panel.webview.postMessage({ 
                            command: 'getRunLogsResponse', 
                            payload: allLogs 
                        });
                    } catch (error) {
                        console.error('Error fetching run logs:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: 'Run 로그를 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                
                // helpers: 파일 내용/sha 유틸을 위에 추가
                async function getFileText(octokit: any, repo: RepoRef, filePath: string, ref = 'main') {
                  const r = await octokit.repos.getContent({ owner: repo.owner, repo: repo.repo, path: filePath, ref });
                  if (Array.isArray(r.data)) return '';
                  const base64 = (r.data as any).content?.replace(/\n/g, '') ?? '';
                  return Buffer.from(base64, 'base64').toString('utf8');
                }

                function isNumericId(s: string) {
                  return /^\d+$/.test(s);
                }

                function ensureWorkflowPathFromWorkflow(wf: any) {
                  if (!wf?.path) throw new Error('워크플로우 경로를 찾을 수 없습니다.');
                  return wf.path as string;
                }

                case 'getWorkflowFile':
                    try {
                        //const actionId = message.payload?.actionId;
                        const actionId = String(message.payload?.actionId);
                        if (!actionId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Action ID가 필요합니다.' 
                            });
                            return;
                        }

                        let workflowPath: string;
                        if (isNumericId(actionId)) {
                          // 숫자 ID → workflow 메타 조회 → path 추출
                          const { data: wf } = await octokit.actions.getWorkflow({
                            owner: repo.owner, repo: repo.repo, workflow_id: Number(actionId)
                          });
                          workflowPath = ensureWorkflowPathFromWorkflow(wf);
                        } else {
                          // 경로(.github/workflows/xxx.yml) 그대로 사용 가능
                          workflowPath = actionId;
                        }

                        // 파일 내용 읽어오기
                        const content = await getFileText(octokit, repo, workflowPath, 'main');

                        panel.webview.postMessage({
                          command: 'getWorkflowFileResponse',
                          payload: content
                        });
                        // const workflowIdOrPath = String(actionId);

                        // // ✅ getWorkflow도 경로/ID 모두 허용
                        // const { data: workflow } = await octokit.actions.getWorkflow({
                        //   owner: repo.owner,
                        //   repo: repo.repo,
                        //   workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : (workflowIdOrPath as any)
                        // });

                        // 여기서는 기본 정보만 반환
                        // panel.webview.postMessage({ 
                        //     command: 'getWorkflowFileResponse', 
                        //     payload: workflow.path 
                        // });
                        } catch (error: any) {
                        console.error('Error fetching workflow file:', error);
                        const hint = error?.status === 404
                          ? ' (이 레포에 해당 워크플로가 없거나 권한 문제일 수 있습니다.)'
                          : '';
                        panel.webview.postMessage({
                          command: 'error',
                          payload: '워크플로우 파일을 가져오는데 실패했습니다.' + hint
                        });
                      }
                    break;
                
                // helpers: sha 조회 + 업서트 유틸 추가
                async function getFileShaIfExists(octokit: any, repo: RepoRef, filePath: string, ref='main') {
                  try {
                    const r = await octokit.repos.getContent({ owner: repo.owner, repo: repo.repo, path: filePath, ref });
                    if (Array.isArray(r.data)) return undefined;
                    return (r.data as any).sha as string;
                  } catch (e: any) {
                    if (e?.status === 404) return undefined;
                    throw e;
                  }
                }

                async function upsertFile(octokit: any, repo: RepoRef, filePath: string, contentUtf8: string, branch='main', message?: string) {
                  const sha = await getFileShaIfExists(octokit, repo, filePath, branch);
                  await octokit.repos.createOrUpdateFileContents({
                    owner: repo.owner,
                    repo: repo.repo,
                    path: filePath,
                    message: message ?? `chore(ci): update ${filePath}`,
                    content: Buffer.from(contentUtf8, 'utf8').toString('base64'),
                    branch,
                    sha, // 있으면 업데이트, 없으면 생성
                    committer: { name: 'MAD Bot', email: 'mad@team-madops.local' },
                    author:    { name: 'MAD Bot', email: 'mad@team-madops.local' },
                  });
                }

                // --- case 'saveWorkflowFile' 교체 ---
                case 'saveWorkflowFile': {
                  try {
                    const actionId = String(message.payload?.actionId);
                    const content = String(message.payload?.content ?? '');
                    if (!actionId) throw new Error('Action ID가 필요합니다.');

                    let workflowPath: string;
                    if (isNumericId(actionId)) {
                      const { data: wf } = await octokit.actions.getWorkflow({
                        owner: repo.owner, repo: repo.repo, workflow_id: Number(actionId)
                      });
                      workflowPath = ensureWorkflowPathFromWorkflow(wf);
                    } else {
                      workflowPath = actionId; // 이미 경로로 넘어옴 (.github/workflows/xxx.yml)
                    }

                    await upsertFile(octokit, repo, workflowPath, content, 'main');

                    panel.webview.postMessage({
                      command: 'saveWorkflowFileResponse',
                      payload: { ok: true, path: workflowPath }
                    });
                  } catch (error: any) {
                    // TODO: 보호 브랜치면 여기서 feature 브랜치/PR 폴백 추가 가능 : ?? 먼솔 
                    panel.webview.postMessage({
                      command: 'saveWorkflowFileResponse',
                      payload: { ok: false, error: error?.message ?? String(error) }
                    });
                  }
                  break;
                }
                
                case 'analyzeRun':
                    try {
                        const runIdStr = message.payload?.runId;
                        if (typeof runIdStr !== 'string') {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Run ID가 문자열이 아닙니다.' 
                            });
                            return;
                        }

                        const runId = parseInt(runIdStr, 10);
                        if (isNaN(runId)) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: `잘못된 Run ID 형식입니다: ${runIdStr}` 
                            });
                            return;
                        }
                        
                        console.log(`[🚀] Webview로부터 LLM 분석 요청 수신 (Run ID: ${runId})`);
                        // TODO : 여기서 triggerLlmAnalysis 사용, 이를 적절하게 대체 필요!
                        // await triggerLlmAnalysis(context, repo, runId);
                        // ✅ 커맨드 경로의 LLM 분석 블록을 그대로 사용 (변수명만 맞춤)
const logMode: 'all' | 'error' = message.payload?.logMode === 'all' ? 'all' : 'error';

await vscode.window.withProgress(
  { location: vscode.ProgressLocation.Notification, title: `Run #${runId} 분석 중...` },
  async (progress) => {
    try {
      progress.report({ message: '로그 ZIP 다운로드 및 프롬프트 생성 중' });

      const { failedSteps, prompts } = await getFailedStepsAndPrompts(
        octokit,
        repo.owner,
        repo.repo,
        runId,
        logMode
      );

      printToOutput(`Run #${runId} 실패한 Step 목록`, failedSteps);
      printToOutput(`Run #${runId} → LLM 프롬프트`, prompts);

      if (prompts.length === 0) {
        panel.webview.postMessage({
          command: 'llmAnalysisResult',
          payload: { runId, summary: '분석할 로그가 없습니다.', rootCause: null, suggestion: null, items: [] }
        });
        vscode.window.showInformationMessage('분석할 로그가 없습니다.');
        return;
      }

      progress.report({ message: 'LLM 호출 중' });

      const analysis = await analyzePrompts(prompts);

      printToOutput('LLM 분석 결과', [JSON.stringify(analysis, null, 2)]);

      // 여기서는 현재 열려있는 대시보드로 보내거나, 바로 이 패널로 회신 둘 중 택1
      if (panels['dashboard']) {
        panels['dashboard'].webview.postMessage({
          command: 'llmAnalysisResult',
          payload: { runId, ...analysis }
        });
      } else {
        panel.webview.postMessage({
          command: 'llmAnalysisResult',
          payload: { runId, ...analysis }
        });
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      panel.webview.postMessage({ command: 'error', payload: `LLM 분석 실패: ${msg}` });
      vscode.window.showErrorMessage(`❌ 분석 실패: ${msg}`);
    }
  }
);

                    } catch (error) {
                        console.error('LLM 분석 시작 중 오류 발생:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: 'LLM 분석을 시작하는 데 실패했습니다.' 
                        });
                    }
                    break;

                case 'analyzeLog':
                    panel.webview.postMessage({ 
                        command: 'error', 
                        payload: '로그 분석은 아직 구현되지 않았습니다.' 
                    });
                    break;
            }
        },
        undefined,
        context.subscriptions
    );

    // Handle when the panel is closed
    panel.onDidDispose(
        () => {
            delete panels[page];
        },
        null,
        context.subscriptions
    );

    // Store the panel and send the initial page message
    panels[page] = panel;
    panel.webview.postMessage({ command: 'changePage', page });
}

export function activate(context: vscode.ExtensionContext) {
  // 🔑 .env를 확실히 로드 (package.json이 있는 확장 루트)
  const envPath = path.join(context.extensionPath, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  
  // 레포 등록/수정
  const cmdSetRepo = vscode.commands.registerCommand('extension.setRepository', async () => {
    await promptAndSaveRepo(context);
  });

  // 레포 삭제
  const cmdClearRepo = vscode.commands.registerCommand('extension.clearRepository', async () => {
    await deleteSavedRepo(context);
  });

  // 레포 보기(선택)
  const cmdShowRepo = vscode.commands.registerCommand('extension.showRepository', async () => {
    const cur = getSavedRepo(context);
    vscode.window.showInformationMessage(`현재 레포: ${cur ? cur.owner + '/' + cur.repo : '(none)'}`);
  });

  context.subscriptions.push(cmdSetRepo, cmdClearRepo, cmdShowRepo);

  const disposable = vscode.commands.registerCommand
  ('extension.analyzeGitHubActions', 
    async (repoArg?: RepoRef) => {

    console.log('[1] 🔍 확장 실행됨');

    
    // 우선순위: 명령 인자 > 저장된 레포
    const repo = repoArg ?? getSavedRepo(context);
    if (!repo) {
      vscode.window.showWarningMessage('저장된 레포가 없습니다. 먼저 레포를 등록하세요.');
      return;
    }
    console.log(`[2] ✅ 레포: ${repo.owner}/${repo.repo}`);


    // GitHub 인증 세션 가져오기
    const octokit = await getOctokitViaVSCodeAuth();
    if (!octokit) {
    vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
    return;
    }
    console.log('[3] 🔑 VS Code GitHub 세션 확보');


    const run_id = await getRunIdFromQuickPick(octokit, repo.owner, repo.repo);
    if (!run_id) {
      vscode.window.showInformationMessage('선택된 워크플로우 실행이 없습니다.');
      return;
    }
    console.log(`[4] ✅ 선택된 Run ID: ${run_id}`);

    const mode = await vscode.window.showQuickPick(['전체 로그', '에러 메세지만'], {
      placeHolder: 'LLM 프롬프트에 포함할 로그 범위 선택'
    });
    
    const logMode = mode === '전체 로그' ? 'all' : 'error';
    
    console.log(`[5] 📄 로그 추출 방식: ${logMode}`);


await vscode.window.withProgress(
  { location: vscode.ProgressLocation.Notification, title: `Run #${run_id} 분석 중...` },
  async (progress) => {
    try {
      progress.report({ message: '로그 ZIP 다운로드 및 프롬프트 생성 중' });

      const { failedSteps, prompts } = await getFailedStepsAndPrompts(
        octokit,
        repo.owner,
        repo.repo,
        run_id,
        logMode
      );

      printToOutput(`Run #${run_id} 실패한 Step 목록`, failedSteps);
      printToOutput(`Run #${run_id} → LLM 프롬프트`, prompts);

      if (prompts.length === 0) {
        vscode.window.showInformationMessage('분석할 로그가 없습니다.');
        return;
      }

      progress.report({ message: 'LLM 호출 중' });

      const analysis = await analyzePrompts(prompts); // { summary, rootCause, suggestion }

      // 출력창에 결과 덤프(선택)
      printToOutput('LLM 분석 결과', [JSON.stringify(analysis, null, 2)]);


          // 웹뷰로 LLM 분석 결과 전송
          if (panels['dashboard']) {
            panels['dashboard'].webview.postMessage({
              command: 'llmAnalysisResult',
              payload: analysis
            });
            vscode.window.showInformationMessage('LLM 분석 결과가 대시보드에 표시되었습니다.');
          } else {
            const summary = analysis.summary ?? 'LLM 분석이 완료되었습니다.';
            const choice = await vscode.window.showInformationMessage(`🧠 ${summary}`, '출력창 열기', '요약 복사');
            if (choice === '출력창 열기') {
              vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            } else if (choice === '요약 복사') {
              await vscode.env.clipboard.writeText(summary);
              vscode.window.showInformationMessage('📋 요약을 클립보드에 복사했어요.');
            }
          }
        } catch (e: any) {
          vscode.window.showErrorMessage(`❌ 분석 실패: ${e?.message ?? e}`);
        }
      }
    );
  });
  context.subscriptions.push(disposable);

  // --- Webview Commands ---
  // Main command to open the webview dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.openDashboard', () => {
        createAndShowWebview(context, 'dashboard');
    })
  );
}


function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
  const buildPath = path.join(context.extensionPath, 'out', 'webview-build');
  
  const scriptPath = path.join(buildPath, 'assets', 'index.js');
  const stylePath = path.join(buildPath, 'assets', 'index.css');

  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(stylePath));

  const nonce = getNonce();

  // The title here is for the HTML document itself, not the panel tab.
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
      <title>MAD Ops</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function deactivate() {
  console.log('📴 GitHub Actions 확장 종료됨');
}
