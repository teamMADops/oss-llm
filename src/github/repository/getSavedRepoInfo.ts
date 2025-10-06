import * as vscode from "vscode";
import { KEY } from "./Constants";
import { RepoInfo } from "./Types";
import normalizeInputAsRepoInfo from "./normalizeInputAsRepoInfo";

export default function getSavedRepoInfo(
  context: vscode.ExtensionContext
): RepoInfo | null {
  const saved = context.globalState.get<string>(KEY);
  if (!saved) return null;
  return normalizeInputAsRepoInfo(saved);
}
