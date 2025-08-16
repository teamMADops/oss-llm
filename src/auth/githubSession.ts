// auth/githubSession.ts
import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';

const GITHUB_PROVIDER = 'github';
// 필요한 권한만 요청: private repo면 'repo', 워크플로 조회/로그엔 'workflow'
const SCOPES = ['repo', 'workflow']; // org 리소스 읽음이 필요하면 'read:org' 추가

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
