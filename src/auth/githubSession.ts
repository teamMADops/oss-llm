// auth/githubSession.ts
import * as vscode from "vscode";
import { Octokit } from "@octokit/rest";

export const GITHUB_PROVIDER = "github";
export const SCOPES = ["repo", "workflow"]; // org 리소스 필요시 'read:org' 추가

export async function getOctokitViaVSCodeAuth(): Promise<Octokit | null> {
  // 없으면 로그인 UI 뜸 (브라우저 리디렉션)
  const session = await vscode.authentication.getSession(
    GITHUB_PROVIDER,
    SCOPES,
    { createIfNone: true }
  );
  if (!session) return null;

  // VS Code가 발급/보관한 accessToken을 바로 사용
  return new Octokit({ auth: session.accessToken });
}

// 현재 세션 확인(조용히): 세션이 없으면 undefined 반환, 로그인 UI 띄우지 않음
export async function getExistingGitHubSession() {
  try {
    const session = await vscode.authentication.getSession(
      GITHUB_PROVIDER,
      SCOPES,
      { createIfNone: false, silent: true } // ✅ 조용히 조회
    );
    return session ?? null;
  } catch {
    return null;
  }
}

/**
 * 로그아웃 유틸:
 * - GitHub Auth 확장에서 제공하는 명령을 호출
 * - VS Code/확장 버전에 따라 'github.signout' 혹은 Accounts 메뉴용 signOut 명령이 존재
 * - 지원되지 않으면 안내 메시지
 */
export async function signOutGitHub(): Promise<boolean> {
  // 1) 세션이 없으면 바로 종료
  const existing = await getExistingGitHubSession();
  if (!existing) return true;

  // 2) 가장 호환성 좋은 기본 명령 시도
  try {
    await vscode.commands.executeCommand("github.signout");
    return true;
  } catch {}

  // 3) 워크벤치 계정 패널 경유(환경별로 지원/미지원 가능)
  try {
    await vscode.commands.executeCommand(
      "workbench.action.accounts.signOutOfAuthenticationProvider",
      { id: GITHUB_PROVIDER, label: "GitHub" }
    );
    return true;
  } catch {}

  // 4) 마지막 안내
  vscode.window.showInformationMessage(
    "로그아웃 명령을 사용할 수 없습니다. 좌측 하단 Accounts(계정) 메뉴에서 GitHub 계정을 수동으로 Sign Out 해주세요."
  );
  return false;
}
