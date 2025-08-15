import * as vscode from 'vscode';
import * as path from 'path';
import { Octokit } from '@octokit/rest';
import { getGitHubToken, deleteGitHubToken } from './auth/tokenManager';
import { getRepoInfo } from './github/getRepoInfo';
import { getRunIdFromQuickPick } from './github/getRunList';
import { getFailedStepsAndPrompts } from './log/getFailedLogs';
import { printToOutput } from './output/printToOutput';

export function activate(context: vscode.ExtensionContext) {

  // token 삭제하는 기능인데, 일단 테스트 해보고 뺄 수도? //
  const deleteToken = vscode.commands.registerCommand('extension.deleteGitHubToken', async () => {
      await deleteGitHubToken(context);
  });
  context.subscriptions.push(deleteToken);

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

  // GitHub Actions Workflow Editor 명령어 : 임시 페이지
  const workflowEditorCommand = vscode.commands.registerCommand('extension.openWorkflowEditor', async () => {
    const panel = vscode.window.createWebviewPanel(
      'workflowEditor',
      'GitHub Actions Workflow Editor',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview-build'))]
      }
    );

    panel.webview.html = getWorkflowEditorContent(context, panel);
    
    // GitHub API 도구 준비
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

    // 웹뷰로부터 메시지 처리
    panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'save':
            vscode.window.showInformationMessage(message.text);
            return;
          case 'getRunList':
            try {
              const runs = await octokit.actions.listWorkflowRunsForRepo({ owner: repo.owner, repo: repo.repo });
              const runItems = runs.data.workflow_runs
                .filter(run => run.status === 'completed') // 완료된 실행만 표시
                .map(run => ({
                  id: run.id,
                  name: run.name,
                  status: run.status,
                  conclusion: run.conclusion,
                  event: run.event,
                  updated_at: run.updated_at,
                }));
              panel.webview.postMessage({ command: 'showRunList', payload: runItems });
            } catch (e: any) {
              panel.webview.postMessage({ command: 'error', payload: `워크플로우 실행 목록을 가져오는 데 실패했습니다: ${e.message}` });
            }
            return;

          case 'analyzeRun':
            try {
              const runId = message.payload.runId;
              if (!runId) return;

              panel.webview.postMessage({ command: 'showLoading', payload: { runId } });

              const { failedSteps, prompts } = await getFailedStepsAndPrompts(
                octokit,
                repo.owner,
                repo.repo,
                runId,
                'error' // 웹뷰에서는 항상 'error' 모드 사용
              );
              panel.webview.postMessage({
                command: 'showAnalysisResult',
                payload: { runId, failedSteps, prompts }
              });
            } catch (e: any) {
              panel.webview.postMessage({ command: 'error', payload: `실행 분석에 실패했습니다: ${e.message}` });
            }
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });
  context.subscriptions.push(workflowEditorCommand);
}

function getWorkflowEditorContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
  const buildPath = path.join(context.extensionPath, 'out', 'webview-build');
  
  const scriptPath = path.join(buildPath, 'assets', 'index.js');
  const stylePath = path.join(buildPath, 'assets', 'index.css');

  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(stylePath));

  const nonce = getNonce();

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
      <title>GitHub Actions Workflow Editor</title>
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