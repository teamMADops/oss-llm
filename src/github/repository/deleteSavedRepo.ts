import * as vscode from "vscode";
import { KEY } from "./Constants";
import getSavedRepoInfo from "./getSavedRepoInfo";
import formatRepoInfo from "./formatRepoInfo";

export default async function deleteSavedRepo(
  context: vscode.ExtensionContext
) {
  const savedRepoInfo = getSavedRepoInfo(context);

  if (!savedRepoInfo) {
    vscode.window.showInformationMessage("저장된 레포가 없습니다.");
    return;
  }

  const pick = await vscode.window.showQuickPick(["삭제", "취소"], {
    placeHolder: `현재: ${formatRepoInfo(savedRepoInfo)} — 삭제할까요?`,
  });
  if (pick !== "삭제") return;

  await context.globalState.update(KEY, undefined);
  vscode.window.showInformationMessage("🗑️ 저장된 레포를 삭제했습니다.");
}
