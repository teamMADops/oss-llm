import * as vscode from "vscode";
import * as path from "path";

import {
  getSavedRepoInfo,
  saveRepo,
  deleteSavedRepo,
  type RepoInfo,
  getOctokitViaVSCodeAuth,
  getExistingGitHubSession,
  isSignOutGitHub,
} from "./github";

import { getRunIdFromQuickPick } from "./github/getRunList";
import { printToOutput } from "./output/printToOutput";

import { getFailedStepsAndPrompts } from "./log/getFailedLogs";
import { analyzePrompts } from "./llm/analyze";

/**
 * It is automatically called when the extension is activated.
 * It register functions as commands.
 * @param context - vscode.ExtensionContext
 */
export function activate(context: vscode.ExtensionContext) {

  const functionRegister = (functionHandler: () => any) => {
    const cmd = vscode.commands.registerCommand(
      `extension.${functionHandler.name}`,
      functionHandler
    );
    context.subscriptions.push(cmd);
  };

  const setOpenAiKey = async () => {
    const key = await vscode.window.showInputBox({
      prompt: "OpenAI API Key를 입력하세요",
      ignoreFocusOut: true,
      password: true,
    });
    if (key) {
      await context.secrets.store("openaiApiKey", key);
      vscode.window.showInformationMessage(
        "✅ OpenAI API Key가 저장되었습니다."
      );
    }
  };
  functionRegister(setOpenAiKey);

  const clearOpenAiKey = async () => {
    await context.secrets.delete("openaiApiKey");
    vscode.window.showInformationMessage("🗑️ OpenAI API Key가 삭제되었습니다.");
  };
  functionRegister(clearOpenAiKey);

  const setRepository = async () => saveRepo(context);
  functionRegister(setRepository);

  const clearRepository = async () => deleteSavedRepo(context);
  functionRegister(clearRepository);

  const showRepository = async () => {
    const cur = getSavedRepoInfo(context);
    vscode.window.showInformationMessage(
      `현재 레포: ${cur ? cur.owner + "/" + cur.repo : "(none)"}`
    );
  };
  functionRegister(showRepository);

  const loginGithub = async () => {
    const before = await getExistingGitHubSession();
    const ok = await getOctokitViaVSCodeAuth();
    if (ok) {
      const after = await getExistingGitHubSession();
      const who = after?.account?.label ?? "GitHub";
      vscode.window.showInformationMessage(
        before ? `이미 로그인되어 있습니다: ${who}` : `로그인 완료: ${who}`
      );
    } else {
      vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
    }
  };
  functionRegister(loginGithub);

  const logoutGithub = async () => {
    const session = await getExistingGitHubSession();
    if (!session) {
      vscode.window.showInformationMessage("이미 로그아웃 상태입니다.");
      return;
    }
    const isSignOut = await isSignOutGitHub();
    if (isSignOut) {
      vscode.window.showInformationMessage("GitHub 로그아웃 완료.");
    }
  };
  functionRegister(logoutGithub);

  const analyzeGitHubActions = async (repoArg?: RepoInfo) => {
    console.log("[1] 🔍 확장 실행됨");

    // 우선순위: 명령 인자 > 저장된 레포
    const repo = repoArg ?? getSavedRepoInfo(context);
    if (!repo) {
      vscode.window.showWarningMessage(
        "저장된 레포가 없습니다. 먼저 레포를 등록하세요."
      );
      return;
    }
    console.log(`[2] ✅ 레포: ${repo.owner}/${repo.repo}`);

    const octokit = await getOctokitViaVSCodeAuth();
    if (!octokit) {
      vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
      return;
    }
    console.log("[3] 🔑 VS Code GitHub 세션 확보");

    const run_id = await getRunIdFromQuickPick(octokit, repo.owner, repo.repo);
    if (!run_id) {
      vscode.window.showInformationMessage(
        "선택된 워크플로우 실행이 없습니다."
      );
      return;
    }
    console.log(`[4] ✅ 선택된 Run ID: ${run_id}`);

    const mode = await vscode.window.showQuickPick(
      ["전체 로그", "에러 메세지만"],
      {
        placeHolder: "LLM 프롬프트에 포함할 로그 범위 선택",
      }
    );

    const logMode = mode === "전체 로그" ? "all" : "error";

    console.log(`[5] 📄 로그 추출 방식: ${logMode}`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Run #${run_id} 분석 중...`,
      },
      async (progress) => {
        try {
          progress.report({
            message: "로그 ZIP 다운로드 및 프롬프트 생성 중",
          });

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
            vscode.window.showInformationMessage("분석할 로그가 없습니다.");
            return;
          }

          progress.report({ message: "LLM 호출 중" });

          const analysis = await analyzePrompts(context, prompts); // { summary, rootCause, suggestion }

          printToOutput("LLM 분석 결과", [JSON.stringify(analysis, null, 2)]);

          if (panels["dashboard"]) {
            panels["dashboard"].webview.postMessage({
              command: "llmAnalysisResult",
              payload: analysis,
            });
            vscode.window.showInformationMessage(
              "LLM 분석 결과가 대시보드에 표시되었습니다."
            );
          } else {
            const summary = analysis.summary ?? "LLM 분석이 완료되었습니다.";
            const choice = await vscode.window.showInformationMessage(
              `🧠 ${summary}`,
              "출력창 열기",
              "요약 복사"
            );
            if (choice === "출력창 열기") {
              vscode.commands.executeCommand(
                "workbench.action.output.toggleOutput"
              );
            } else if (choice === "요약 복사") {
              await vscode.env.clipboard.writeText(summary);
              vscode.window.showInformationMessage(
                "📋 요약을 클립보드에 복사했어요."
              );
            }
          }
        } catch (e: any) {
          vscode.window.showErrorMessage(`❌ 분석 실패: ${e?.message ?? e}`);
        }
      }
    );
  };
  functionRegister(analyzeGitHubActions);

  const openDashboard = async () => {
    createAndShowWebview(context, "dashboard");
  };
  functionRegister(openDashboard);

  // Extension 활성화 시 자동으로 대시보드 열기
  setTimeout(() => {
    openDashboard();
  }, 100);
}

const panels: { [key: string]: vscode.WebviewPanel } = {};
const isNumeric = (s: any) => typeof s === "string" && /^\d+$/.test(s);

type Page = "dashboard" | "editor" | "history";

/**
 * Creates and shows a new webview panel, or reveals an existing one.
 * Manages panel lifecycle and communication between the extension and the webview.
 * @param context The extension context.
 * @param page The page to display in the webview ('dashboard', 'editor', 'history').
 */
function createAndShowWebview(context: vscode.ExtensionContext, page: Page) {
  console.log(`[extension.ts] 웹뷰 생성 시작: ${page}`);
  
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  const pageTitle = `MAD Ops: ${page.charAt(0).toUpperCase() + page.slice(1)}`;

  // If we already have a panel for this page, show it.
  if (panels[page]) {
    console.log(`[extension.ts] 기존 패널 사용: ${page}`);
    panels[page].reveal(column);
    // Also send a message to ensure the correct page is displayed, in case the user changed it.
    panels[page].webview.postMessage({ command: "changePage", page });
    return;
  }

  console.log(`[extension.ts] 새 웹뷰 패널 생성: ${pageTitle}`);
  const panel = vscode.window.createWebviewPanel(
    page,
    pageTitle,
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(
          path.join(context.extensionPath, "out", "webview-build")
        ),
      ],
    }
  );

  console.log(`[extension.ts] 웹뷰 HTML 설정 중...`);
  panel.webview.html = getWebviewContent(context, panel);
  console.log(`[extension.ts] 웹뷰 HTML 설정 완료`);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      // Settings 관련 메시지 처리 (GitHub 인증 불필요)
      console.log('[extension.ts] 받은 메시지:', message.command, message);
      
      switch (message.command) {
        case 'checkSettings': {
          // 초기 설정 확인
          console.log('[extension.ts] 설정 확인 중...');
          const githubSession = await getExistingGitHubSession();
          const savedRepo = getSavedRepoInfo(context);
          const hasOpenAiKey = !!(await context.secrets.get("openaiApiKey"));

          console.log('[extension.ts] 설정 상태:', {
            hasGithubSession: !!githubSession,
            hasSavedRepo: !!savedRepo,
            hasOpenAiKey
          });

          const isConfigured = githubSession && savedRepo && hasOpenAiKey;

          // 실제 설정 데이터를 모달에 전달
          console.log('[extension.ts] 설정 모달 표시 요청');
          
          // API 키 가져오기 (실제 값 전달)
          let apiKeyValue = '';
          if (hasOpenAiKey) {
            const actualKey = await context.secrets.get("openaiApiKey");
            if (actualKey) {
              apiKeyValue = actualKey;
            }
          }
          
          // GitHub 사용자 정보 가져오기
          let githubUserInfo = null;
          if (githubSession) {
            try {
              const octokit = await getOctokitViaVSCodeAuth();
              if (octokit) {
                const { data: user } = await octokit.rest.users.getAuthenticated();
                githubUserInfo = {
                  username: user.login,
                  avatarUrl: user.avatar_url,
                  name: user.name || user.login
                };
              }
            } catch (error) {
              console.error('[extension.ts] GitHub 사용자 정보 가져오기 실패:', error);
              githubUserInfo = {
                username: githubSession.account.label,
                avatarUrl: '',
                name: githubSession.account.label
              };
            }
          }
          
          const currentSettings = {
            githubAuthenticated: !!githubSession,
            githubUser: githubUserInfo,
            openaiApiKey: apiKeyValue, // 실제 API 키 전달 (눈 아이콘으로 보이기/숨기기 가능)
            repositoryUrl: savedRepo ? `${savedRepo.owner}/${savedRepo.repo}` : '',
          };
          
          console.log('[extension.ts] 전달할 설정 데이터:', currentSettings);
          
          panel.webview.postMessage({
            command: "showSettings",
            payload: {
              isInitialSetup: !isConfigured, // 설정이 완료되지 않았을 때만 초기 설정으로 표시
              currentSettings: currentSettings
            }
          });

          if (!isConfigured) {
            console.log('[extension.ts] 설정이 완료되지 않음 - 모달 표시');
          } else {
            console.log('[extension.ts] 설정이 이미 완료되어 있음 - 테스트용 모달 표시');
          }
          return;
        }

        case 'requestGithubLogin': {
          // GitHub 로그인 요청
          console.log('[extension.ts] GitHub 로그인 요청 받음');
          try {
            const octokit = await getOctokitViaVSCodeAuth();
            if (octokit) {
              const session = await getExistingGitHubSession();
              
              // GitHub API로 사용자 정보 가져오기
              try {
                const { data: user } = await octokit.rest.users.getAuthenticated();
                panel.webview.postMessage({
                  command: "githubLoginResult",
                  payload: {
                    success: true,
                    username: user.login,
                    avatarUrl: user.avatar_url,
                    name: user.name || user.login
                  }
                });
              } catch (apiError) {
                // API 호출 실패 시 세션 정보만 사용
                panel.webview.postMessage({
                  command: "githubLoginResult",
                  payload: {
                    success: true,
                    username: session?.account?.label || 'GitHub User',
                    avatarUrl: '',
                    name: session?.account?.label || 'GitHub User'
                  }
                });
              }
            } else {
              panel.webview.postMessage({
                command: "githubLoginResult",
                payload: {
                  success: false,
                  error: 'GitHub 로그인에 실패했습니다.'
                }
              });
            }
          } catch (error: any) {
            panel.webview.postMessage({
              command: "githubLoginResult",
              payload: {
                success: false,
                error: error?.message || 'GitHub 로그인 중 오류가 발생했습니다.'
              }
            });
          }
          return;
        }

        case 'openExternalUrl': {
          // 외부 URL 열기
          const url = message.payload?.url;
          if (url) {
            vscode.env.openExternal(vscode.Uri.parse(url));
          }
          return;
        }

        case 'saveSettings': {
          // 설정 저장
          console.log('[extension.ts] 설정 저장 요청 받음:', message.payload);
          try {
            const { openaiApiKey, repositoryUrl } = message.payload;

            // OpenAI API 키 저장 (실제 값이 있을 때만)
            if (openaiApiKey && openaiApiKey.trim()) {
              await context.secrets.store("openaiApiKey", openaiApiKey);
            }

            // 레포지토리 정보 저장
            if (repositoryUrl) {
              const repoInfo = await import('./github/repository/normalizeInputAsRepoInfo');
              const normalized = repoInfo.default(repositoryUrl);
              if (normalized) {
                const KEY = (await import('./github/repository/Constants')).KEY;
                await context.globalState.update(KEY, `${normalized.owner}/${normalized.repo}`);
              }
            }

            // 저장 완료 메시지
            console.log('[extension.ts] 설정 저장 완료, 웹뷰에 알림');
            console.log('[extension.ts] settingsSaved 메시지 전송 중...');
            
            panel.webview.postMessage({
              command: "settingsSaved",
              payload: { success: true }
            });
            
            console.log('[extension.ts] settingsSaved 메시지 전송 완료');

            vscode.window.showInformationMessage("✅ 설정이 저장되었습니다.");
          } catch (error: any) {
            panel.webview.postMessage({
              command: "error",
              payload: `설정 저장 실패: ${error?.message || error}`
            });
            vscode.window.showErrorMessage(`설정 저장 실패: ${error?.message || error}`);
          }
          return;
        }
      }

      // 기존 메시지 처리 (GitHub 인증 필요)
      const octokit = await getOctokitViaVSCodeAuth();
      if (!octokit) {
        vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
        return;
      }
      console.log("[3] 🔑 VS Code GitHub 세션 확보");

      const repo = getSavedRepoInfo(context);
      if (!repo) {
        panel.webview.postMessage({
          command: "error",
          payload: "GitHub 리포지토리 정보를 찾을 수 없습니다.",
        });
        return;
      }

      switch (message.command) {
        case "getActions":
          try {
            const { data: workflows } = await octokit.actions.listRepoWorkflows(
              {
                owner: repo.owner,
                repo: repo.repo,
              }
            );

            console.log(`[📋] 워크플로우 개수: ${workflows.workflows.length}`);

            if (workflows.workflows.length === 0) {
              console.log("[⚠️] 워크플로우 파일이 없습니다.");
              panel.webview.postMessage({
                command: "getActionsResponse",
                payload: [],
              });
              return;
            }

            const actions = (workflows.workflows ?? []).map((w) => {
              const key = w.path || String(w.id);
              return {
                // 프론트에서 기존 필드명(actionId)을 그대로 쓰되, 값은 "경로"로 보냄
                actionId: key,
                id: String(w.id), // 참고용
                path: w.path ?? null, // 참고용
                name: w.name ?? key,
                status: w.state === "active" ? "success" : "failed",
              };
            });

            console.log(`[✅] 워크플로우 목록:`, actions);
            send(panel, "getActionsResponse", actions);
          } catch (error) {
            console.error("Error fetching actions:", error);
            send(panel, "error", "워크플로우 목록을 가져오는데 실패했습니다.");
          }
          break;

        case "getLatestRun":
          try {
            const actionId = message.payload?.actionId;
            if (!actionId) {
              send(panel, "error", "Action ID가 필요합니다.");
              return;
            }

            const workflowIdOrPath = String(actionId);

            const { data: runs } = await octokit.actions.listWorkflowRuns({
              owner: repo.owner,
              repo: repo.repo,
              // GitHub API는 문자열 경로('.github/workflows/ci.yml') 또는 숫자 id 모두 허용
              workflow_id: isNumeric(workflowIdOrPath)
                ? Number(workflowIdOrPath)
                : (workflowIdOrPath as any),
              per_page: 1,
            });

            if (runs.workflow_runs.length > 0) {
              const run = runs.workflow_runs[0];
              const latestRun = {
                id: run.id.toString(),
                status: run.status,
                conclusion: run.conclusion || "unknown",
                timestamp: run.created_at,
                reason: run.head_commit?.message || "Unknown",
              };

              send(panel, "getLatestRunResponse", latestRun);
            } else {
              send(panel, "getLatestRunResponse", null);
            }
          } catch (error) {
            console.error("Error fetching latest run:", error);
            send(panel, "error", "최신 실행 정보를 가져오는데 실패했습니다.");
          }
          break;

        case "getRunHistory":
          try {
            const actionId = message.payload?.actionId;
            if (!actionId) {
              send(panel, "error", "Action ID가 필요합니다.");
              return;
            }

            const workflowIdOrPath = String(actionId);
            console.log(
              `[🔍] 워크플로우 ${workflowIdOrPath} 실행 기록 조회 (owner=${repo.owner}, repo=${repo.repo})`
            );

            const { data: runs } = await octokit.actions.listWorkflowRuns({
              owner: repo.owner,
              repo: repo.repo,
              workflow_id: isNumeric(workflowIdOrPath)
                ? Number(workflowIdOrPath)
                : (workflowIdOrPath as any),
              per_page: 10,
            });
            console.log(`[📊] 실행 기록 개수: ${runs.workflow_runs.length}`);

            const runHistory = runs.workflow_runs.map((run) => ({
              id: run.id.toString(),
              status: run.status,
              conclusion: run.conclusion || "unknown",
              timestamp: run.created_at,
              reason: run.head_commit?.message || "Unknown",
              branch: run.head_branch,
              commit: run.head_sha?.substring(0, 7) || "Unknown",
              author: run.head_commit?.author?.name || "Unknown",
            }));

            send(panel, "getRunHistoryResponse", runHistory);
          } catch (error) {
            console.error("Error fetching run history:", error);
            send(panel, "error", "실행 기록을 가져오는데 실패했습니다.");
          }
          break;

        case "getLatestRunFromAllActions":
          try {
            console.log(
              `[🔍] 모든 actions 중 가장 최근 run 조회 (owner=${repo.owner}, repo=${repo.repo})`
            );

            const { data: workflows } = await octokit.actions.listRepoWorkflows(
              {
                owner: repo.owner,
                repo: repo.repo,
              }
            );

            let latestRun = null;
            let latestTimestamp = 0;

            for (const workflow of workflows.workflows) {
              try {
                const { data: runs } = await octokit.actions.listWorkflowRuns({
                  owner: repo.owner,
                  repo: repo.repo,
                  workflow_id: workflow.id,
                  per_page: 1,
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
                      reason: run.head_commit?.message || "Unknown",
                      actionId: workflow.path || workflow.id.toString(),
                    };
                  }
                }
              } catch (workflowError) {
                console.log(
                  `워크플로우 ${workflow.id} 실행 기록 조회 실패:`,
                  workflowError
                );
              }
            }

            console.log(`[✅] 가장 최근 run:`, latestRun);

            send(panel, "getLatestRunFromAllActionsResponse", latestRun);
          } catch (error) {
            console.error("Error fetching latest run from all actions:", error);
            send(
              panel,
              "error",
              "가장 최근 실행 정보를 가져오는데 실패했습니다."
            );
          }
          break;

        case "getRunDetails":
          try {
            const runId = message.payload?.runId;
            if (!runId) {
              send(panel, "error", "Run ID가 필요합니다.");
              return;
            }

            console.log(
              `[🔍] Run 상세 정보 조회: ${runId} (owner=${repo.owner}, repo=${repo.repo})`
            );

            const { data: run } = await octokit.actions.getWorkflowRun({
              owner: repo.owner,
              repo: repo.repo,
              run_id: Number(runId),
            });

            const { data: jobs } = await octokit.actions.listJobsForWorkflowRun(
              {
                owner: repo.owner,
                repo: repo.repo,
                run_id: Number(runId),
              }
            );

            const runDetails = {
              id: run.id.toString(),
              status: run.status,
              conclusion: run.conclusion,
              timestamp: run.created_at,
              reason: run.head_commit?.message || "Unknown",
              branch: run.head_branch || "Unknown",
              workflow: run.name || "Unknown",
              runNumber: run.run_number,
              duration: "Unknown", // GitHub API에서 duration을 직접 제공하지 않음
              commit: run.head_sha?.substring(0, 7) || "Unknown",
              author: run.head_commit?.author?.name || "Unknown",
              jobs: jobs.jobs,
            };

            console.log(`[✅] Run 상세 정보:`, runDetails);

            send(panel, "getRunDetailsResponse", runDetails);
          } catch (error) {
            console.error("Error fetching run details:", error);
            send(panel, "error", "Run 상세 정보를 가져오는데 실패했습니다.");
          }
          break;

        case "getRunLogs":
          try {
            const runId = message.payload?.runId;
            if (!runId) {
              send(panel, "error", "Run ID가 필요합니다.");
              return;
            }

            console.log(
              `[🔍] Run 로그 다운로드: ${runId} (owner=${repo.owner}, repo=${repo.repo})`
            );

            const { data: logs } = await octokit.request(
              "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
              {
                owner: repo.owner,
                repo: repo.repo,
                run_id: Number(runId),
                request: { responseType: "arraybuffer" as any },
              }
            );

            const JSZip = require("jszip");
            const zip = await JSZip.loadAsync(logs);

            let allLogs = "";
            const txtFiles = Object.values(zip.files).filter(
              (f: any) => !f.dir && f.name.endsWith(".txt")
            );

            for (const file of txtFiles) {
              const content = await (file as any).async("string");
              allLogs += `=== ${(file as any).name} ===\n${content}\n\n`;
            }

            console.log(
              `[✅] Run 로그 다운로드 완료: ${txtFiles.length}개 파일`
            );

            send(panel, "getRunLogsResponse", allLogs);
          } catch (error: any) {
            console.error("Error fetching run logs:", error);
            // [FIX] 로그를 가져올 수 없을 때 에러 대신 안내 메시지 전송
            const errorMsg = error?.status === 404 
              ? "로그를 찾을 수 없습니다. (로그가 만료되었거나, 아직 생성되지 않았거나, 진행 중일 수 있습니다)"
              : `로그를 가져오는데 실패했습니다: ${error?.message || error}`;
            send(panel, "getRunLogsResponse", errorMsg);
          }
          break;

        case "getWorkflowFile":
          async function getFileText(
            octokit: any,
            repo: RepoInfo,
            filePath: string,
            ref = "main"
          ) {
            const r = await octokit.repos.getContent({
              owner: repo.owner,
              repo: repo.repo,
              path: filePath,
              ref,
            });
            if (Array.isArray(r.data)) return "";
            const base64 = (r.data as any).content?.replace(/\n/g, "") ?? "";
            return Buffer.from(base64, "base64").toString("utf8");
          }

          try {
            const actionId = String(message.payload?.actionId);
            if (!actionId) {
              send(panel, "error", "Action ID가 필요합니다.");
              return;
            }

            let workflowPath: string;
            if (isNumericId(actionId)) {
              const { data: wf } = await octokit.actions.getWorkflow({
                owner: repo.owner,
                repo: repo.repo,
                workflow_id: Number(actionId),
              });
              workflowPath = ensureWorkflowPathFromWorkflow(wf);
            } else {
              // 경로(.github/workflows/xxx.yml) 그대로 사용 가능
              workflowPath = actionId;
            }

            const content = await getFileText(
              octokit,
              repo,
              workflowPath,
              "main"
            );

            send(panel, "getWorkflowFileResponse", content);
          } catch (error: any) {
            console.error("Error fetching workflow file:", error);
            const hint =
              error?.status === 404
                ? " (이 레포에 해당 워크플로가 없거나 권한 문제일 수 있습니다.)"
                : "";
            send(
              panel,
              "error",
              "워크플로우 파일을 가져오는데 실패했습니다." + hint
            );
          }
          break;

        case "saveWorkflowFile": {
          async function getFileShaIfExists(
            octokit: any,
            repo: RepoInfo,
            filePath: string,
            ref = "main"
          ) {
            try {
              const r = await octokit.repos.getContent({
                owner: repo.owner,
                repo: repo.repo,
                path: filePath,
                ref,
              });
              if (Array.isArray(r.data)) return undefined;
              return (r.data as any).sha as string;
            } catch (e: any) {
              if (e?.status === 404) return undefined;
              throw e;
            }
          }

          async function upsertFile(
            octokit: any,
            repo: RepoInfo,
            filePath: string,
            contentUtf8: string,
            branch = "main",
            message?: string
          ) {
            const sha = await getFileShaIfExists(
              octokit,
              repo,
              filePath,
              branch
            );
            await octokit.repos.createOrUpdateFileContents({
              owner: repo.owner,
              repo: repo.repo,
              path: filePath,
              message: message ?? `chore(ci): update ${filePath}`,
              content: Buffer.from(contentUtf8, "utf8").toString("base64"),
              branch,
              sha, // 있으면 업데이트, 없으면 생성
              committer: { name: "MAD Bot", email: "mad@team-madops.local" },
              author: { name: "MAD Bot", email: "mad@team-madops.local" },
            });
          }

          try {
            const actionId = String(message.payload?.actionId);
            const content = String(message.payload?.content ?? "");
            if (!actionId) throw new Error("Action ID가 필요합니다.");

            let workflowPath: string;
            if (isNumericId(actionId)) {
              const { data: wf } = await octokit.actions.getWorkflow({
                owner: repo.owner,
                repo: repo.repo,
                workflow_id: Number(actionId),
              });
              workflowPath = ensureWorkflowPathFromWorkflow(wf);
            } else {
              workflowPath = actionId; // 이미 경로로 넘어옴 (.github/workflows/xxx.yml)
            }

            await upsertFile(octokit, repo, workflowPath, content, "main");

            send(panel, "saveWorkflowFileResponse", {
              ok: true,
              path: workflowPath,
            });
          } catch (error: any) {
            // TODO: 보호 브랜치면 여기서 feature 브랜치/PR 폴백 추가 가능 : ?? 먼솔
            send(panel, "saveWorkflowFileResponse", {
              ok: false,
              error: error?.message ?? String(error),
            });
          }
          break;
        }

        case "analyzeRun":
          try {
            const runIdStr = message.payload?.runId;
            if (typeof runIdStr !== "string") {
              send(panel, "error", "Run ID가 문자열이 아닙니다.");
              return;
            }

            const runId = parseInt(runIdStr, 10);
            if (isNaN(runId)) {
              panel.webview.postMessage({
                command: "error",
                payload: `잘못된 Run ID 형식입니다: ${runIdStr}`,
              });
              return;
            }

            console.log(
              `[🚀] Webview로부터 LLM 분석 요청 수신 (Run ID: ${runId})`
            );

            // [ADD] Run 상태 확인
            const { data: run } = await octokit.actions.getWorkflowRun({
              owner: repo.owner,
              repo: repo.repo,
              run_id: runId,
            });

            // [ADD] 성공한 workflow는 LLM 분석 없이 성공 메시지 전송
            if (run.conclusion === "success") {
              console.log(`[✅] Run #${runId}는 성공한 작업입니다.`);
              const successResult = {
                runId,
                status: "success" as const,
                summary: "성공한 작업입니다!",
                rootCause: "",
                suggestion: "",
              };
              
              if (panels["dashboard"]) {
                panels["dashboard"].webview.postMessage({
                  command: "llmAnalysisResult",
                  payload: successResult,
                });
              } else {
                send(panel, "llmAnalysisResult", successResult);
              }
              return;
            }

            // TODO : 여기서 triggerLlmAnalysis 사용, 이를 적절하게 대체 필요!
            // await triggerLlmAnalysis(context, repo, runId);
            // ✅ 커맨드 경로의 LLM 분석 블록을 그대로 사용 (변수명만 맞춤)
            const logMode: "all" | "error" =
              message.payload?.logMode === "all" ? "all" : "error";

            await vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: `Run #${runId} 분석 중...`,
              },
              async (progress) => {
                try {
                  progress.report({
                    message: "로그 ZIP 다운로드 및 프롬프트 생성 중",
                  });

                  const { failedSteps, prompts } =
                    await getFailedStepsAndPrompts(
                      octokit,
                      repo.owner,
                      repo.repo,
                      runId,
                      logMode
                    );

                  printToOutput(`Run #${runId} 실패한 Step 목록`, failedSteps);
                  printToOutput(`Run #${runId} → LLM 프롬프트`, prompts);

                  if (prompts.length === 0) {
                    send(panel, "llmAnalysisResult", {
                      runId,
                      summary: "분석할 로그가 없습니다.",
                      rootCause: null,
                      suggestion: null,
                      items: [],
                    });
                    vscode.window.showInformationMessage(
                      "분석할 로그가 없습니다."
                    );
                    return;
                  }

                  progress.report({ message: "LLM 호출 중" });

                  // const analysis = await analyzePrompts(prompts);
                  const analysis = await analyzePrompts(context, prompts);

                  printToOutput("LLM 분석 결과", [
                    JSON.stringify(analysis, null, 2),
                  ]);

                  // [MOD] 성공적으로 분석된 결과에 status 추가
                  const resultWithStatus = {
                    runId,
                    status: "failure" as const,
                    ...analysis,
                  };

                  // 여기서는 현재 열려있는 대시보드로 보내거나, 바로 이 패널로 회신 둘 중 택1
                  if (panels["dashboard"]) {
                    panels["dashboard"].webview.postMessage({
                      command: "llmAnalysisResult",
                      payload: resultWithStatus,
                    });
                  } else {
                    send(panel, "llmAnalysisResult", resultWithStatus);
                  }
                } catch (e: any) {
                  const msg = e?.message ?? String(e);
                  console.error(`[❌] LLM 분석 실패: ${msg}`);
                  
                  // [MOD] 에러 정보를 UI로 전송
                  const errorResult = {
                    runId,
                    status: "error" as const,
                    summary: "분석이 실패했습니다",
                    rootCause: "",
                    suggestion: "",
                    error: msg,
                  };

                  if (panels["dashboard"]) {
                    panels["dashboard"].webview.postMessage({
                      command: "llmAnalysisResult",
                      payload: errorResult,
                    });
                  } else {
                    send(panel, "llmAnalysisResult", errorResult);
                  }
                  
                  vscode.window.showErrorMessage(`❌ 분석 실패: ${msg}`);
                }
              }
            );
          } catch (error) {
            console.error("LLM 분석 시작 중 오류 발생:", error);
            send(panel, "error", "LLM 분석을 시작하는 데 실패했습니다.");
          }
          break;

        case "analyzeLog":
          send(panel, "error", "로그 분석은 아직 구현되지 않았습니다.");
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
  panel.webview.postMessage({ command: "changePage", page });
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): string {
  const buildPath = path.join(context.extensionPath, "out", "webview-build");

  const scriptPath = path.join(buildPath, "assets", "index.js");
  const stylePath = path.join(buildPath, "assets", "index.css");

  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(stylePath));

  const nonce = getNonce();

  console.log('[extension.ts] 웹뷰 HTML 생성 중...');
  console.log('[extension.ts] 빌드 경로:', buildPath);
  console.log('[extension.ts] 스크립트 URI:', scriptUri.toString());
  console.log('[extension.ts] 스타일 URI:', styleUri.toString());

  // The title here is for the HTML document itself, not the panel tab.
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${panel.webview.cspSource} data:; img-src ${panel.webview.cspSource} https: data:;">
      <title>MAD Ops</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}">
        // VSCode API 주입 (완전 격리)
        console.log('[Webview] 스크립트 로드 시작');
        
        // acquireVsCodeApi 함수를 임시로 저장
        const originalAcquireVsCodeApi = window.acquireVsCodeApi;
        
        try {
          // 한 번만 초기화
          if (!window.vscode) {
            window.vscode = originalAcquireVsCodeApi();
            console.log('[Webview] VSCode API 초기화됨');
            console.log('[Webview] vscode 객체:', window.vscode);
          } else {
            console.log('[Webview] VSCode API 이미 존재함');
          }
          
          // acquireVsCodeApi 함수를 제거하여 중복 호출 방지
          delete window.acquireVsCodeApi;
          
          // React 앱에서 사용할 수 있도록 전역 함수 제공
          window.getVscode = function() {
            return window.vscode;
          };
          
        } catch (error) {
          console.log('[Webview] VSCode API 초기화 실패:', error.message);
          // 실패해도 acquireVsCodeApi 함수는 제거
          delete window.acquireVsCodeApi;
        }
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
    
  console.log('[extension.ts] 웹뷰 HTML 생성 완료');
  return html;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function send(panel: vscode.WebviewPanel, command: string, payload: any) {
  panel.webview.postMessage({ command, payload });
}

function isNumericId(s: string) {
  return /^\d+$/.test(s);
}

function ensureWorkflowPathFromWorkflow(wf: any) {
  if (!wf?.path) throw new Error("워크플로우 경로를 찾을 수 없습니다.");
  return wf.path as string;
}

