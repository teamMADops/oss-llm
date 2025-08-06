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
exports.activate = activate;
exports.deactivate = deactivate;
// src/extension.ts
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const rest_1 = require("@octokit/rest");
const tokenManager_1 = require("./auth/tokenManager");
const getRepoInfo_1 = require("./github/getRepoInfo");
const getRunList_1 = require("./github/getRunList");
const getFailedLogs_1 = require("./log/getFailedLogs");
const printToOutput_1 = require("./output/printToOutput");
function activate(context) {
    const disposable = vscode.commands.registerCommand('extension.analyzeGitHubActions', async () => {
        console.log('[1] 🔍 확장 실행됨');
        const repo = await (0, getRepoInfo_1.getRepoInfo)();
        if (!repo) {
            vscode.window.showErrorMessage('GitHub 리포지토리 정보를 찾을 수 없습니다.');
            return;
        }
        console.log(`[2] ✅ 리포지토리 감지됨: ${repo.owner}/${repo.repo}`);
        const token = await (0, tokenManager_1.getGitHubToken)(context);
        if (!token) {
            vscode.window.showErrorMessage('GitHub 토큰이 필요합니다.');
            return;
        }
        console.log(`[3] 🔑 GitHub 토큰 확보됨 (길이: ${token.length})`);
        const octokit = new rest_1.Octokit({ auth: token });
        const run_id = await (0, getRunList_1.getRunIdFromQuickPick)(octokit, repo.owner, repo.repo);
        if (!run_id) {
            vscode.window.showInformationMessage('선택된 워크플로우 실행이 없습니다.');
            return;
        }
        console.log(`[4] ✅ 선택된 Run ID: ${run_id}`);
        const mode = await vscode.window.showQuickPick(['전체 로그', '마지막 20줄'], {
            placeHolder: 'LLM 프롬프트에 포함할 로그 범위 선택'
        });
        const logMode = mode === '전체 로그' ? 'all' : 'tail';
        console.log(`[5] 📄 로그 추출 방식: ${logMode}`);
        const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, run_id, logMode);
        console.log(`[6] 📛 실패한 Step 개수: ${failedSteps.length}`);
        console.log(`[7] ✨ 프롬프트 생성 완료 (${prompts.length}개)`);
        (0, printToOutput_1.printToOutput)(`Run #${run_id} 실패한 Step 목록`, failedSteps);
        (0, printToOutput_1.printToOutput)(`Run #${run_id} → LLM 프롬프트`, prompts);
        vscode.window.showInformationMessage(`✅ 분석 완료: ${failedSteps.length}개 실패 step`);
    });
    context.subscriptions.push(disposable);
    // 0. 웹뷰 개발 시작 전 테스트를 위한 Hello World 페이지
    const helloWorldCommand = vscode.commands.registerCommand('extension.helloWorld', () => {
        const panel = vscode.window.createWebviewPanel('helloWorld', 'Hello World', vscode.ViewColumn.One, {
            enableScripts: true
        });
        panel.webview.html = getWebviewContent(context);
        // Hello World webview 메시지 처리
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'showMessage':
                    vscode.window.showInformationMessage(message.text);
                    return;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(helloWorldCommand);
    // 1. GitHub Actions Workflow Editor 명령어 : 임시 페이지 
    const workflowEditorCommand = vscode.commands.registerCommand('extension.openWorkflowEditor', () => {
        const panel = vscode.window.createWebviewPanel('workflowEditor', 'GitHub Actions Workflow Editor', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = getWorkflowEditorContent(context);
        // webview와 확장간 메시지 통신 설정
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'submitPrompt':
                    vscode.window.showInformationMessage(`LLM Prompt submitted: ${message.text}`);
                    return;
                case 'saveWorkflow':
                    vscode.window.showInformationMessage('Workflow saved successfully!');
                    return;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(workflowEditorCommand);
    function getWebviewContent(context) {
        const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'hello.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
    function getWorkflowEditorContent(context) {
        const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'workflow_editor.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}
function deactivate() {
    console.log('📴 GitHub Actions 확장 종료됨');
}
