// src/github/getRunList.ts
import { Octokit } from '@octokit/rest';
import * as vscode from 'vscode';

export async function getRunIdFromQuickPick(octokit: Octokit, owner: string, repo: string): Promise<number | undefined> {
  console.log(`[🔁] Fetching workflow run list... (${owner}/${repo})`);
  try {
    const runs = await octokit.actions.listWorkflowRunsForRepo({ owner, repo });

    const items = runs.data.workflow_runs.map(run => ({
      label: `#${run.id} - ${run.name}`,
      description: `Status: ${run.status} | Conclusion: ${run.conclusion}`,
      run_id: run.id
    }));

    console.log(`[📋] Loaded ${items.length} runs`);
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a failed workflow run",
    });

    if (selected) {
      console.log(`[👉] Selected run_id: ${selected.run_id}`);
      return selected.run_id;
    } else {
      console.log(`[⛔] No run selected by user`);
      return undefined;
    }
  } catch (err) {
    console.error(`[❌] Failed to load workflow runs:`, err);
    vscode.window.showErrorMessage('Failed to fetch workflow runs.');
    return undefined;
  }
}
