// src/github/getRepoInfo.ts
// 사용자, repo 이름 가져오기

import * as vscode from 'vscode';

export async function getRepoInfo(): Promise<{ owner: string; repo: string } | null> {
  // 하드코딩된 리포지토리 정보 사용
  const owner = 'angkmfirefoxygal';
  const repo = 'oss';
  
  console.log(`[🔍] 하드코딩된 리포지토리 정보: ${owner}/${repo}`);
  return { owner, repo };
}
