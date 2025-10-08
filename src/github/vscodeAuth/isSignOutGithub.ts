import * as vscode from "vscode";
import getExistingGithubSession from "./getExistingGithubSession";
import { GITHUB_PROVIDER } from "./Constants";

export default async function isSignOutGitHub(): Promise<boolean> {
  const existing = await getExistingGithubSession();
  if (!existing) {
    return true;
  }

  try {
    await vscode.authentication.getSession(GITHUB_PROVIDER, [], {
      clearSessionPreference: true,
      createIfNone: false
    });

    vscode.window.showInformationMessage(`GitHub 로그아웃 완료: ${existing.account.label}`);
    return true;
  } catch (err) {
    const openAccounts = await vscode.window.showWarningMessage(
      "자동 로그아웃에 실패했습니다. Accounts 메뉴를 열어드릴까요?",
      "Accounts 열기",
      "취소"
    );

    if (openAccounts === "Accounts 열기") {
      await vscode.commands.executeCommand("workbench.actions.manage");
    }
    return false;
  }
}
