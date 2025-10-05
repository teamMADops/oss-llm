import * as vscode from "vscode";
import { GITHUB_PROVIDER, SCOPES } from "./Constant";

export default async function getGithubSession(
  createIfNone: boolean = false,
  silent: boolean = false
): Promise<vscode.AuthenticationSession | undefined> {
  return await vscode.authentication.getSession(GITHUB_PROVIDER, SCOPES, {
    createIfNone,
    silent,
  });
}
