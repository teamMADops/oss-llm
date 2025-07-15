// src/auth/tokenManager.ts
import * as vscode from 'vscode';

const TOKEN_KEY = 'github_token';

export async function getGitHubToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  let token = context.workspaceState.get<string>(TOKEN_KEY);

  if (token) {
    console.log('[🔐] 저장된 GitHub 토큰 사용');
    return token;
  }

  console.log('[📝] GitHub 토큰 없음 → 사용자 입력 필요');
  token = await vscode.window.showInputBox({
    prompt: 'GitHub Personal Access Token을 입력하세요',
    password: true,
    ignoreFocusOut: true
  });

  if (token) {
    await context.workspaceState.update(TOKEN_KEY, token);
    console.log('[💾] GitHub 토큰 저장 완료 (workspaceState)');
    return token;
  }

  console.log('[⛔] 사용자 입력 없음 → 토큰 불러오기 실패');
  return undefined;
}
