import * as vscode from "vscode";
import getExistingGithubSession from "./getExistingGithubSession";
import { GITHUB_PROVIDER } from "./Constant";

export default async function isSignOutGitHub(): Promise<boolean> {
  // 1) 세션이 없으면 바로 종료
  const existing = await getExistingGithubSession();
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
