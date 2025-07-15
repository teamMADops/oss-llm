// src/github/getRepoInfo.ts
import * as vscode from 'vscode';
import simpleGit from 'simple-git';

export async function getRepoInfo(): Promise<{ owner: string; repo: string } | null> {
  const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!folderUri) {
    console.log('[❌] 워크스페이스 폴더 없음');
    return null;
  }

  console.log(`[📁] Git repo 디렉토리: ${folderUri}`);
  const git = simpleGit(folderUri);

  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');

    if (!origin || !origin.refs.fetch) {
      console.log('[❌] origin remote 없음');
      return null;
    }

    const match = origin.refs.fetch.match(/github\.com[:/](.+?)\/(.+?)\.git/);
    if (match) {
      const [, owner, repo] = match;
      console.log(`[🔍] origin → owner: ${owner}, repo: ${repo}`);
      return { owner, repo };
    } else {
      console.log('[❌] GitHub origin 주소 파싱 실패');
      return null;
    }
  } catch (err) {
    console.error('[❌] Git repo 정보 가져오기 실패:', err);
    return null;
  }
}
