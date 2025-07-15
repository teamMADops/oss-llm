// src/github/getRunList.ts
import { Octokit } from '@octokit/rest';
import * as vscode from 'vscode';

export async function getRunIdFromQuickPick(octokit: Octokit, owner: string, repo: string): Promise<number | undefined> {
  console.log(`[🔁] run 목록 가져오는 중... (${owner}/${repo})`);
  try {
    const runs = await octokit.actions.listWorkflowRunsForRepo({ owner, repo });

    const items = runs.data.workflow_runs.map(run => ({
      label: `#${run.id} - ${run.name}`,
      description: `Status: ${run.status} | Conclusion: ${run.conclusion}`,
      run_id: run.id
    }));

    console.log(`[📋] 총 ${items.length}개 run 불러옴`);
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '실패한 Run을 선택하세요'
    });

    if (selected) {
      console.log(`[👉] 선택된 run_id: ${selected.run_id}`);
      return selected.run_id;
    } else {
      console.log(`[⛔] 사용자가 run 선택 안함`);
      return undefined;
    }
  } catch (err) {
    console.error(`[❌] run 목록 불러오기 실패:`, err);
    vscode.window.showErrorMessage('워크플로우 목록을 가져오는 데 실패했습니다.');
    return undefined;
  }
}
