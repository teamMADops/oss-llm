import getGithubSession from "./getGithubSession";

export default async function getExistingGitHubSession() {
  try {
    const silent = true;
    const session = await getGithubSession(false, silent);
    return session ?? undefined;
  } catch {
    return undefined;
  }
}
