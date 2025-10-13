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
      `✅ Repository saved: ${formatRepoInfo(repoInfo)}`
    );
  }
}

async function getRepoInfo(
  context: vscode.ExtensionContext
): Promise<RepoInfo | null> {
  const savedRepo = getSavedRepoInfo(context);
  const input = await vscode.window.showInputBox({
    prompt: "Enter the GitHub repository to save (owner/repo or GitHub URL)",
    placeHolder: "ex) yourGithubName/yourRepoName",
    value: savedRepo ? formatRepoInfo(savedRepo) : "",
    ignoreFocusOut: true,
    validateInput: (text) =>
      normalizeInputAsRepoInfo(text)
        ? null
        :  "Input must be in owner/repo format or a valid GitHub URL.",
  });
  if (!input) return null;

  return normalizeInputAsRepoInfo(input);
}
