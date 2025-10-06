import { RepoInfo } from "./Types";

/**
 * @param input - owner/repo or Github URL
 * @returns
 */
export default function normalizeInputAsRepoInfo(input: string): RepoInfo | null {
  if (!input) return null;
  const s = input.trim();

  // 1) owner/repo
  if (/^[^/]+\/[^/]+$/i.test(s)) {
    const [owner, repo] = s.split("/");
    return { owner, repo };
  }

  // 2) GitHub URL (엔터프라이즈/SSH 포함), .git 유무
  const m = s.match(/github[^/:]*[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}
