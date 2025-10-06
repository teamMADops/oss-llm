import { RepoInfo } from "./Types";

export default function formatRepoInfo(repoInfo: RepoInfo | null | undefined) {
  return repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "(none)";
}
