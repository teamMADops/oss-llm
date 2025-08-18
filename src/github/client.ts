import { Octokit } from "@octokit/rest";
export const makeOctokit = () => new Octokit({ auth: process.env.GITHUB_TOKEN! });
