// 수정 예정
import * as vscode from 'vscode';
import * as path from 'path';
import { Octokit } from '@octokit/rest';

import { getSavedRepo, promptAndSaveRepo,deleteSavedRepo, type RepoRef} from './github/getRepoInfo';
import { getOctokitViaVSCodeAuth } from './auth/githubSession';

import { getRunIdFromQuickPick } from './github/getRunList';
import { printToOutput } from './output/printToOutput';       
import { spawn } from 'child_process';
import * as crypto from 'crypto';


function resolveServerBase(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('oss');
  const fromSetting = cfg.get<string>('serverBase');
  if (fromSetting) return fromSetting;
  if (process.env.SERVER_BASE) return process.env.SERVER_BASE;
  return context.extensionMode === vscode.ExtensionMode.Development
    ? 'http://localhost:4310'
    : 'https://YOUR-DEPLOYED-API.example.com';
}

// Webview panel management - Keep track of panels to prevent duplicates
const panels: { [key: string]: vscode.WebviewPanel } = {};

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
            // All messages from the webview will be handled here.
            // This is where the API layer described in structure.md is implemented on the extension side.
            const repo = await getRepoInfo();
            if (!repo) {
                panel.webview.postMessage({ command: 'error', payload: 'GitHub 리포지토리 정보를 찾을 수 없습니다.' });
                return;
            }
            const token = await getGitHubToken(context);
            if (!token) {
                panel.webview.postMessage({ command: 'error', payload: 'GitHub 토큰을 찾을 수 없습니다. 설정 명령을 실행해주세요.' });
                return;
            }
            const octokit = new Octokit({ auth: token });

            switch (message.command) {
                // These are placeholders for the API calls defined in structure.md
                case 'getActions':
                    // TODO: Implement logic to get the list of workflow files (actions)
                    break;
                case 'getLatestRun':
                    // TODO: Implement logic to get the latest run for a specific action
                    break;
                case 'getRunHistory':
                    // TODO: Implement logic to get the run history for a specific action
                    break;
                case 'getWorkflowFile':
                    // TODO: Implement logic to get the content of a workflow file
                    break;
                case 'saveWorkflowFile':
                    // TODO: Implement logic to save the content of a workflow file
                    break;
                case 'analyzeLog':
                    // TODO: Implement logic to analyze a log with an LLM
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

  //   const { failedSteps, prompts } = await getFailedStepsAndPrompts(
  //     octokit,
  //     repo.owner,
  //     repo.repo,
  //     run_id,
  //     logMode
  //   );

  //   console.log(`[6] 📛 실패한 Step 개수: ${failedSteps.length}`);
  //   console.log(`[7] ✨ 프롬프트 생성 완료 (${prompts.length}개)`);

  //   printToOutput(`Run #${run_id} 실패한 Step 목록`, failedSteps);
  //   printToOutput(`Run #${run_id} → LLM 프롬프트`, prompts);
  //   vscode.window.showInformationMessage(`✅ 분석 완료: ${failedSteps.length}개 실패 step`); // 웹뷰에 띄워주는건감

   // 서버로 분석 요청 (LLM 분석은 서버에서 수행)
    const SERVER_BASE = resolveServerBase(context);

    // 로그 찍는겨 
    printToOutput('SERVER_BASE', [resolveServerBase(context)]);


    if (!/^https?:\/\//.test(SERVER_BASE) || SERVER_BASE.includes('YOUR-DEPLOYED-API')) {
      vscode.window.showErrorMessage(`SERVER_BASE가 올바르지 않습니다: ${SERVER_BASE}`);
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Run #${run_id} 분석 중...` },
      async (progress) => {
        try {
          progress.report({ message: '서버에 분석 요청 전송' });

          // 로그 찍는거
          console.log("[EXT] 📤 서버로 분석 요청 전송", {
            url: `${SERVER_BASE}/api/analyze-run`,
            owner: repo.owner,
            name: repo.repo,
            runId: run_id,
            logMode
          });

          const res = await fetch(`${SERVER_BASE}/api/analyze-run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // 서버 스키마 주의: repo.name이어야 함
              repo: { owner: repo.owner, name: repo.repo },
              runId: run_id,
              logMode
            })
          });
          
          // 로그 찍는거
          console.log("[EXT] 📥 서버 응답 수신", res.status, res.statusText);
          
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            // 로그용
            printToOutput('analyze-run FAIL', [
            `${res.status} ${res.statusText}`,
              err || '(no body)'
            ]);throw new Error(err?.error ?? res.statusText);
          }

          progress.report({ message: 'LLM 응답 수신' });
          const data: any = await res.json(); // { correlationId?, runId, analysis, ... }
          const analysis = data?.analysis;

          if (!analysis) {
            vscode.window.showInformationMessage('분석할 실패 Step이 없습니다.');
            return;
          }

          // 출력창에 전체 결과(JSON) 덤프
          printToOutput('LLM 분석 결과', [JSON.stringify(analysis, null, 2)]);

          // 요약만 팝업으로
          const summary = analysis.summary ?? 'LLM 분석이 완료되었습니다.';
          const choice = await vscode.window.showInformationMessage(`🧠 ${summary}`, '출력창 열기', '요약 복사');
          if (choice === '출력창 열기') {
            vscode.commands.executeCommand('workbench.action.output.toggleOutput');
          } else if (choice === '요약 복사') {
            await vscode.env.clipboard.writeText(summary);
            vscode.window.showInformationMessage('📋 요약을 클립보드에 복사했어요.');
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
