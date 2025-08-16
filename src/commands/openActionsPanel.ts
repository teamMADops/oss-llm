// src/commands/openActionsPanel.ts
import * as vscode from 'vscode';
import { getOctokitViaVSCodeAuth } from '../auth/githubSession';
import { getSavedRepo } from '../github/getRepoInfo';
import { listWorkflows, listWorkflowRuns, getRunMeta, listJobsMeta } from '../github/actionsApi';

export function registerOpenActionsPanel(context: vscode.ExtensionContext) {
  const cmdActionPanel = vscode.commands.registerCommand('extension.openActionsPanel', async () => {
    const panel = vscode.window.createWebviewPanel(
      'actions',
      'Actions',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const octokit = await getOctokitViaVSCodeAuth();
    if (!octokit) {
      vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
      return;
    }
    console.log('[3] 🔑 VS Code GitHub 세션 확보');

    const repo = await getSavedRepo(context);
    if (!repo) {
      vscode.window.showWarningMessage('레포 정보를 먼저 등록하세요.');
      return;
    }

    panel.webview.onDidReceiveMessage(async (m: any) => {
      try {
        if (m.type === 'REQ_WORKFLOWS') {
          const items = await listWorkflows(octokit as any, repo);
          panel.webview.postMessage({ type: 'RES_WORKFLOWS', items });
        } else if (m.type === 'REQ_RUNS') {
          const { runs, total } = await listWorkflowRuns(
            octokit as any, repo, m.workflowId, m.page ?? 1, m.perPage ?? 20
          );
          panel.webview.postMessage({ type: 'RES_RUNS', workflowId: m.workflowId, runs, total });
        } else if (m.type === 'REQ_RUN_DETAIL') {
          const info = await getRunMeta(octokit as any, repo, m.runId);
          const jobs = await listJobsMeta(octokit as any, repo, m.runId);
          panel.webview.postMessage({ type: 'RES_RUN_DETAIL', runId: m.runId, info, jobs });
        }
      } catch (e: any) {
        panel.webview.postMessage({ type: 'ERROR', message: e?.message ?? String(e) });
      }
    });

    panel.webview.postMessage({ type: 'BOOT' });
  });

  context.subscriptions.push(cmdActionPanel);
}
