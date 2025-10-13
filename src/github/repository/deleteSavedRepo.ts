import * as vscode from "vscode";
import { KEY } from "./Constants";
import getSavedRepoInfo from "./getSavedRepoInfo";
import formatRepoInfo from "./formatRepoInfo";

export default async function deleteSavedRepo(
  context: vscode.ExtensionContext
) {
  const savedRepoInfo = getSavedRepoInfo(context);

  if (!savedRepoInfo) {
    vscode.window.showInformationMessage("No saved repository found.");
    return;
  }

  const pick = await vscode.window.showQuickPick(["Delete", "Cancel"], {
    placeHolder: `Current: ${formatRepoInfo(savedRepoInfo)} — Do you want to delete it?`,
  });
  if (pick !== "Delete") return;

  await context.globalState.update(KEY, undefined);
  vscode.window.showInformationMessage("🗑️ Saved repository has been deleted.");
}
