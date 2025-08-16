"use strict";
// // src/github/repoRegistry.ts
// import * as vscode from 'vscode';
// export type RepoRef = { owner: string; repo: string };
// /** 전역 저장 키 */
// const KEY = 'gh_actions_analyzer.fixed_repo';
// /** GitHub 여부(Enterprise 포함) 판별 + owner/repo 파싱 */
// export function parseOwnerRepo(input: string): RepoRef | null {
//   if (!input) return null;
//   const s = input.trim().replace(/\s+/g, '');
//   // 1) 이미 owner/repo 형식
//   if (/^[^/]+\/[^/]+$/i.test(s)) {
//     const [owner, repo] = s.split('/');
//     return { owner, repo };
//   }
//   // 2) URL/SSH: github.com 또는 github.{enterprise}
//   //    - 예: https://github.com/owner/repo(.git)
//   //    - 예: git@github.com:owner/repo(.git)
//   //    - 예: https://github.mycompany.com/owner/repo(.git)
//   const m = s.match(/github[^/:]*[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/i);
//   if (m) {
//     const owner = m[1];
//     const repo = m[2];
//     return { owner, repo };
//   }
//   return null;
// }
// /** 표준화된 "owner/repo" 문자열로 반환 (파싱 실패 시 null) */
// export function normalizeOwnerRepo(input: string): string | null {
//   const parsed = parseOwnerRepo(input);
//   if (!parsed) return null;
//   return `${parsed.owner}/${parsed.repo}`;
// }
// /** 전역에 레포 저장 (owner/repo 또는 GitHub URL 허용) */
// export async function setFixedRepo(context: vscode.ExtensionContext, value: string): Promise<void> {
//   const normalized = normalizeOwnerRepo(value);
//   if (!normalized) {
//     throw new Error('owner/repo 또는 유효한 GitHub URL을 입력하세요.');
//   }
//   await context.globalState.update(KEY, normalized);
// }
// /** 전역에서 레포 읽기 (없으면 null) */
// export function getFixedRepo(context: vscode.ExtensionContext): RepoRef | null {
//   const saved = context.globalState.get<string>(KEY);
//   if (!saved) return null;
//   // 저장 시 이미 normalize 했지만, 혹시 몰라 한 번 더 검증
//   const parsed = parseOwnerRepo(saved);
//   return parsed;
// }
// /** 전역 레포 삭제 */
// export async function clearFixedRepo(context: vscode.ExtensionContext): Promise<void> {
//   await context.globalState.update(KEY, undefined);
// }
// /** 디버깅/로그용 포맷터 */
// export function formatRepo(ref: RepoRef | null | undefined): string {
//   return ref ? `${ref.owner}/${ref.repo}` : '(none)';
// }
