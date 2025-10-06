import * as vscode from "vscode";
import { KEY } from "./Constants";
import getSavedRepoInfo from "./getSavedRepoInfo";
import formatRepoInfo from "./formatRepoInfo";
import normalizeInputAsRepoInfo from "./normalizeInputAsRepoInfo";
import { RepoInfo } from "./Types";

export default async function saveRepo(context: vscode.ExtensionContext) {
  const repoInfo = await getRepoInfo(context);
  if (repoInfo) {
    await context.globalState.update(KEY, `${repoInfo.owner}/${repoInfo.repo}`);
    vscode.window.showInformationMessage(
      `✅ 레포 저장됨: ${formatRepoInfo(repoInfo)}`
    );
  }
}

async function getRepoInfo(
  context: vscode.ExtensionContext
): Promise<RepoInfo | null> {
  const savedRepo = getSavedRepoInfo(context);
  const input = await vscode.window.showInputBox({
    prompt: "저장할 GitHub 레포를 입력하세요 (owner/repo 또는 GitHub URL)",
    placeHolder: "ex) yourGithubName/yourRepoName",
    value: savedRepo ? formatRepoInfo(savedRepo) : "",
    ignoreFocusOut: true,
    validateInput: (text) =>
      normalizeInputAsRepoInfo(text)
        ? null
        : "owner/repo 또는 유효한 GitHub URL 형식이어야 합니다.",
  });
  if (!input) return null;

  return normalizeInputAsRepoInfo(input);
}
