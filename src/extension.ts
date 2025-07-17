// src/extension.ts
import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { getGitHubToken } from './auth/tokenManager';
import { deleteGitHubToken } from './auth/tokenManager';
import { getRepoInfo } from './github/getRepoInfo';
import { getRunIdFromQuickPick } from './github/getRunList';
import { getFailedStepsAndPrompts } from './log/getFailedLogs';
import { printToOutput } from './output/printToOutput';

export function activate(context: vscode.ExtensionContext) {

  // token 삭제하는 기능인데, 일단 테스트 해보고 뺄 수도? ////////
  const deleteToken = vscode.commands.registerCommand('extension.deleteGitHubToken', async () => {
      await deleteGitHubToken(context);
  });

  context.subscriptions.push(deleteToken);

  //////////////////////////////////////////

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
      vscode.window.showErrorMessage('GitHub 토큰이 필요합니다.');
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
}

export function deactivate() {
  console.log('📴 GitHub Actions 확장 종료됨');
}
