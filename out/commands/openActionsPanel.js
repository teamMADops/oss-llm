"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOpenActionsPanel = registerOpenActionsPanel;
// src/commands/openActionsPanel.ts
const vscode = __importStar(require("vscode"));
const githubSession_1 = require("../auth/githubSession");
const getRepoInfo_1 = require("../github/getRepoInfo");
const actionsApi_1 = require("../github/actionsApi");
function registerOpenActionsPanel(context) {
    const cmdActionPanel = vscode.commands.registerCommand('extension.openActionsPanel', async () => {
        const panel = vscode.window.createWebviewPanel('actions', 'Actions', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        const octokit = await (0, githubSession_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
            return;
        }
        console.log('[3] 🔑 VS Code GitHub 세션 확보');
        const repo = await (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            vscode.window.showWarningMessage('레포 정보를 먼저 등록하세요.');
            return;
        }
        panel.webview.onDidReceiveMessage(async (m) => {
            try {
                if (m.type === 'REQ_WORKFLOWS') {
                    const items = await (0, actionsApi_1.listWorkflows)(octokit, repo);
                    panel.webview.postMessage({ type: 'RES_WORKFLOWS', items });
                }
                else if (m.type === 'REQ_RUNS') {
                    const { runs, total } = await (0, actionsApi_1.listWorkflowRuns)(octokit, repo, m.workflowId, m.page ?? 1, m.perPage ?? 20);
                    panel.webview.postMessage({ type: 'RES_RUNS', workflowId: m.workflowId, runs, total });
                }
                else if (m.type === 'REQ_RUN_DETAIL') {
                    const info = await (0, actionsApi_1.getRunMeta)(octokit, repo, m.runId);
                    const jobs = await (0, actionsApi_1.listJobsMeta)(octokit, repo, m.runId);
                    panel.webview.postMessage({ type: 'RES_RUN_DETAIL', runId: m.runId, info, jobs });
                }
            }
            catch (e) {
                panel.webview.postMessage({ type: 'ERROR', message: e?.message ?? String(e) });
            }
        });
        panel.webview.postMessage({ type: 'BOOT' });
    });
    context.subscriptions.push(cmdActionPanel);
}
