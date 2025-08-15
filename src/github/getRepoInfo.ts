// src/github/getRepoInfo.ts
import * as vscode from 'vscode';

export type RepoRef = { owner: string; repo: string };

/** 전역 저장 키 */
const KEY = 'gh_actions_analyzer.fixed_repo';

/** 보기 좋게 */
export function formatRepo(ref: RepoRef | null | undefined) {
  return ref ? `${ref.owner}/${ref.repo}` : '(none)';
}


/** owner/repo 또는 GitHub URL(https/ssh, .git 유무) 파싱 */
function parseOwnerRepo(input: string): RepoRef | null {
  if (!input) return null;
  const s = input.trim();

  // 1) owner/repo
  if (/^[^/]+\/[^/]+$/i.test(s)) {
    const [owner, repo] = s.split('/');
    return { owner, repo };
  }

  // 2) GitHub URL (엔터프라이즈/SSH 포함), .git 유무
  const m = s.match(/github[^/:]*[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/* ------------------------------------------------------------------ */
/* 전역 저장 기반 CRUD (등록/수정/삭제/조회)                         */
/* ------------------------------------------------------------------ */

/** 저장된 레포 읽기 */
export function getSavedRepo(context: vscode.ExtensionContext): RepoRef | null {
  const saved = context.globalState.get<string>(KEY);
  if (!saved) return null;
  const parsed = parseOwnerRepo(saved);
  return parsed;
}

/** 등록/수정: 입력받아 전역 저장 */
export async function promptAndSaveRepo(context: vscode.ExtensionContext): Promise<RepoRef | null> {
  const current = getSavedRepo(context);
  const value = await vscode.window.showInputBox({
    prompt: '저장할 GitHub 레포를 입력하세요 (owner/repo 또는 GitHub URL)',
    placeHolder: 'ex) octocat/Hello-World',
    value: current ? formatRepo(current) : '',
    ignoreFocusOut: true,
    validateInput: (text) => (parseOwnerRepo(text) ? null : 'owner/repo 또는 유효한 GitHub URL 형식이어야 합니다.')
  });
  if (!value) return null;

  const parsed = parseOwnerRepo(value)!;
  await context.globalState.update(KEY, `${parsed.owner}/${parsed.repo}`);
  vscode.window.showInformationMessage(`✅ 레포 저장됨: ${formatRepo(parsed)}`);
  return parsed;
}

/** 삭제 */
export async function deleteSavedRepo(context: vscode.ExtensionContext): Promise<void> {
  const current = getSavedRepo(context);
  if (!current) {
    vscode.window.showInformationMessage('저장된 레포가 없습니다.');
    return;
  }
  const pick = await vscode.window.showQuickPick(['삭제', '취소'], {
    placeHolder: `현재: ${formatRepo(current)} — 삭제할까요?`
  });
  if (pick !== '삭제') return;

  await context.globalState.update(KEY, undefined);
  vscode.window.showInformationMessage('🗑️ 저장된 레포를 삭제했습니다.');
}
