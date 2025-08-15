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

  //토큰 발급 페이지로 리디렉션 (만약 토큰이 없다면)
   const selection = await vscode.window.showInformationMessage(
    'GitHub Token이 필요합니다. 브라우저에서 발급하려면 여기를 클릭하세요.',
    '발급 페이지 열기', '이미 발급함'
  );

 if (selection === '발급 페이지 열기') {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens'));
    
    // 사용자가 발급 완료 후 버튼 누를 때까지 대기
    const confirm = await vscode.window.showInformationMessage(
      '토큰을 복사하셨나요?',
      '입력하러 가기'
    );
    if (confirm !== '입력하러 가기') {
      vscode.window.showWarningMessage('토큰 입력이 취소되었습니다.');
      return undefined;
    }
  } else if (selection !== '이미 발급함') {
    // 사용자가 아무것도 선택 안 하고 닫은 경우
    vscode.window.showWarningMessage('토큰 발급이 취소되었습니다.');
    return undefined;
  }

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


// 토큰 삭제 함수(나중에 필요하게 될지도)
export async function deleteGitHubToken(context: vscode.ExtensionContext): Promise<void> {
  await context.workspaceState.update(TOKEN_KEY, undefined);
  vscode.window.showInformationMessage('저장된 GitHub 토큰이 삭제되었습니다.');
}