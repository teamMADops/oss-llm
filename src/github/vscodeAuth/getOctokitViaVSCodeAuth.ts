import { Octokit } from "@octokit/rest";
import getGithubSession from "./getGithubSession";

export default async function getOctokitViaVSCodeAuth(): Promise<Octokit | null> {
  const createIfNone = true; // 없으면 로그인 UI 뜸 (브라우저 리디렉션)
  const session = await getGithubSession(createIfNone);
  if (!session) return null;

  return new Octokit({ auth: session.accessToken });
}
