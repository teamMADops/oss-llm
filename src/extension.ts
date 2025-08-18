import * as vscode from 'vscode';
import * as path from 'path';
import { Octokit } from '@octokit/rest';
import { getGitHubToken, deleteGitHubToken } from './auth/tokenManager';
import { getRepoInfo } from './github/getRepoInfo';
import { getRunIdFromQuickPick } from './github/getRunList';
import { getFailedStepsAndPrompts } from './log/getFailedLogs';
import { printToOutput } from './output/printToOutput';

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
                        
                        const actions = workflows.workflows.map(workflow => ({
                            id: workflow.id.toString(),
                            name: workflow.name,
                            status: workflow.state === 'active' ? 'success' : 'failed'
                        }));
                        
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
                        
                        // 특정 워크플로우의 최신 실행 가져오기
                        const { data: runs } = await octokit.actions.listWorkflowRuns({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: parseInt(actionId),
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
                        
                        console.log(`[🔍] 워크플로우 ID ${actionId}의 실행 기록을 가져오는 중...`);
                        
                        // 특정 워크플로우의 실행 기록 가져오기
                        const { data: runs } = await octokit.actions.listWorkflowRuns({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: parseInt(actionId),
                            per_page: 10
                        });
                        
                        console.log(`[📊] 실행 기록 개수: ${runs.workflow_runs.length}`);
                        
                        const runHistory = runs.workflow_runs.map(run => ({
                            id: run.id.toString(),
                            status: run.status,
                            conclusion: run.conclusion || 'unknown',
                            timestamp: run.created_at,
                            reason: run.head_commit?.message || 'Unknown',
                            branch: run.head_branch
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
                    
                case 'getWorkflowFile':
                    try {
                        const actionId = message.payload?.actionId;
                        if (!actionId) {
                            panel.webview.postMessage({ 
                                command: 'error', 
                                payload: 'Action ID가 필요합니다.' 
                            });
                            return;
                        }
                        
                        // 워크플로우 파일 내용 가져오기
                        const { data: workflow } = await octokit.actions.getWorkflow({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: parseInt(actionId)
                        });
                        
                        // 워크플로우 파일의 YAML 내용을 가져오기 위해 추가 API 호출 필요
                        // 여기서는 기본 정보만 반환
                        panel.webview.postMessage({ 
                            command: 'getWorkflowFileResponse', 
                            payload: workflow.path 
                        });
                    } catch (error) {
                        console.error('Error fetching workflow file:', error);
                        panel.webview.postMessage({ 
                            command: 'error', 
                            payload: '워크플로우 파일을 가져오는데 실패했습니다.' 
                        });
                    }
                    break;
                    
                case 'saveWorkflowFile':
                    // TODO: 워크플로우 파일 저장 로직 구현
                    panel.webview.postMessage({ 
                        command: 'error', 
                        payload: '워크플로우 파일 저장은 아직 구현되지 않았습니다.' 
                    });
                    break;
                    
                case 'analyzeLog':
                    // TODO: LLM을 사용한 로그 분석 로직 구현
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

  // token 삭제하는 기능인데, 일단 테스트 해보고 뺄 수도? //
  const deleteToken = vscode.commands.registerCommand('extension.deleteGitHubToken', async () => {
      await deleteGitHubToken(context);
  });
  context.subscriptions.push(deleteToken);

  // This is the original command that runs the analysis from the command palette.
  const disposable = vscode.commands.registerCommand('extension.analyzeGitHubActions', async () => {
    console.log('[1] 🔍 확장 실행됨');
    
    const repo = await getRepoInfo();
    if (!repo) {
      vscode.window.showErrorMessage('GitHub 리포지토리 정보를 찾을 수 없습니다.');
      return;
    }
    console.log(`[2] ✅ 리포지토리 감지됨: ${repo.owner}/${repo.repo}`);

    const token = await getGitHubToken(context);
    if (!token) {
      // vscode.window.showErrorMessage('GitHub 토큰이 필요합니다.');
      // 토큰 관리자가 이미 오류 메시지를 표시합니다.
      return;
    }
    console.log(`[3] 🔑 GitHub 토큰 확보됨 (길이: ${token.length})`);

    const octokit = new Octokit({ auth: token });

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

    const { failedSteps, prompts } = await getFailedStepsAndPrompts(
      octokit,
      repo.owner,
      repo.repo,
      run_id,
      logMode
    );

    console.log(`[6] 📛 실패한 Step 개수: ${failedSteps.length}`);
    console.log(`[7] ✨ 프롬프트 생성 완료 (${prompts.length}개)`);

    printToOutput(`Run #${run_id} 실패한 Step 목록`, failedSteps);
    printToOutput(`Run #${run_id} → LLM 프롬프트`, prompts);
    vscode.window.showInformationMessage(`✅ 분석 완료: ${failedSteps.length}개 실패 step`);
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
