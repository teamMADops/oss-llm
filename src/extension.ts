import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getSavedRepo, promptAndSaveRepo,deleteSavedRepo, type RepoRef} from './github/getRepoInfo';
import { getOctokitViaVSCodeAuth } from './auth/githubSession';
import { registerOpenActionsPanel } from './commands/openActionsPanel';
import { getRunIdFromQuickPick } from './github/getRunList';
import { getFailedStepsAndPrompts } from './log/getFailedLogs';
import { printToOutput } from './output/printToOutput';

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

  // github action panel 띄우기!
  registerOpenActionsPanel(context);

  // 실패한 action llm 분석
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
    
    //github auto auth-login
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

  // 0. 웹뷰 개발 시작 전 테스트를 위한 Hello World 페이지
  const helloWorldCommand = vscode.commands.registerCommand('extension.helloWorld', () => {
    const panel = vscode.window.createWebviewPanel(
      'helloWorld',
      'Hello World',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    panel.webview.html = getWebviewContent(context);
    
    // Hello World webview 메시지 처리
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'showMessage':
            vscode.window.showInformationMessage(message.text);
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(helloWorldCommand);

  // 1. GitHub Actions Workflow Editor 명령어 : 임시 페이지 
  const workflowEditorCommand = vscode.commands.registerCommand('extension.openWorkflowEditor', () => {
    const panel = vscode.window.createWebviewPanel(
      'workflowEditor',
      'GitHub Actions Workflow Editor',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = getWorkflowEditorContent(context, panel);
    
    // webview와 확장간 메시지 통신 설정
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'submitPrompt':
            vscode.window.showInformationMessage(`LLM Prompt submitted: ${message.text}`);
            return;
          case 'saveWorkflow':
            vscode.window.showInformationMessage('Workflow saved successfully!');
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(workflowEditorCommand);

  function getWebviewContent(context: vscode.ExtensionContext) {
    const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'hello.html');
    return fs.readFileSync(htmlPath, 'utf8');
  }

  function getWorkflowEditorContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'workflow_editor', 'workflow_editor.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Common CSS
    const commonCssPath = path.join(context.extensionPath, 'src', 'webview', 'common', 'common.css');
    const commonCssUri = panel.webview.asWebviewUri(vscode.Uri.file(commonCssPath));
    htmlContent = htmlContent.replace('href="../common/common.css"', `href="${commonCssUri}"`);

    // Page-specific CSS
    const pageCssPath = path.join(context.extensionPath, 'src', 'webview', 'workflow_editor', 'workflow_editor.css');
    const pageCssUri = panel.webview.asWebviewUri(vscode.Uri.file(pageCssPath));
    htmlContent = htmlContent.replace('href="workflow_editor.css"', `href="${pageCssUri}"`);

    return htmlContent;
  }
}

export function deactivate() {
  console.log('📴 GitHub Actions 확장 종료됨');
}
