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
