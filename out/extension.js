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
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const getRepoInfo_1 = require("./github/getRepoInfo");
const githubSession_1 = require("./auth/githubSession");
const openActionsPanel_1 = require("./commands/openActionsPanel");
const getRunList_1 = require("./github/getRunList");
const getFailedLogs_1 = require("./log/getFailedLogs");
const printToOutput_1 = require("./output/printToOutput");
function activate(context) {
    // 레포 등록/수정
    const cmdSetRepo = vscode.commands.registerCommand('extension.setRepository', async () => {
        await (0, getRepoInfo_1.promptAndSaveRepo)(context);
    });
    // 레포 삭제
    const cmdClearRepo = vscode.commands.registerCommand('extension.clearRepository', async () => {
        await (0, getRepoInfo_1.deleteSavedRepo)(context);
    });
    // 레포 보기(선택)
    const cmdShowRepo = vscode.commands.registerCommand('extension.showRepository', async () => {
        const cur = (0, getRepoInfo_1.getSavedRepo)(context);
        vscode.window.showInformationMessage(`현재 레포: ${cur ? cur.owner + '/' + cur.repo : '(none)'}`);
    });
    context.subscriptions.push(cmdSetRepo, cmdClearRepo, cmdShowRepo);
    // github action panel 띄우기!
    (0, openActionsPanel_1.registerOpenActionsPanel)(context);
    // 실패한 action llm 분석
    const disposable = vscode.commands.registerCommand('extension.analyzeGitHubActions', async (repoArg) => {
        console.log('[1] 🔍 확장 실행됨');
        // 우선순위: 명령 인자 > 저장된 레포
        const repo = repoArg ?? (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            vscode.window.showWarningMessage('저장된 레포가 없습니다. 먼저 레포를 등록하세요.');
            return;
        }
        console.log(`[2] ✅ 레포: ${repo.owner}/${repo.repo}`);
        //github auto auth-login
        const octokit = await (0, githubSession_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
            return;
        }
        console.log('[3] 🔑 VS Code GitHub 세션 확보');
        const run_id = await (0, getRunList_1.getRunIdFromQuickPick)(octokit, repo.owner, repo.repo);
        if (!run_id) {
            vscode.window.showInformationMessage('선택된 워크플로우 실행이 없습니다.');
            return;
        }
        const mode = await vscode.window.showQuickPick(['전체 로그', '에러 메세지만'], {
            placeHolder: 'LLM 프롬프트에 포함할 로그 범위 선택'
        });
        const logMode = mode === '전체 로그' ? 'all' : 'error';
        console.log(`[5] 📄 로그 추출 방식: ${logMode}`);
        const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, run_id, logMode);
        console.log(`[6] 📛 실패한 Step 개수: ${failedSteps.length}`);
        console.log(`[7] ✨ 프롬프트 생성 완료 (${prompts.length}개)`);
        (0, printToOutput_1.printToOutput)(`Run #${run_id} 실패한 Step 목록`, failedSteps);
        (0, printToOutput_1.printToOutput)(`Run #${run_id} → LLM 프롬프트`, prompts);
        vscode.window.showInformationMessage(`✅ 분석 완료: ${failedSteps.length}개 실패 step`);
    });
    context.subscriptions.push(disposable);
    // 1. GitHub Actions Workflow Editor 명령어 : 임시 페이지 
    const workflowEditorCommand = vscode.commands.registerCommand('extension.openWorkflowEditor', () => {
        const panel = vscode.window.createWebviewPanel('workflowEditor', 'GitHub Actions Workflow Editor', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = getWorkflowEditorContent(context, panel);
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
    function getWorkflowEditorContent(context, panel) {
        const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'workflow_editor', 'workflow_editor.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        // Common CSS
        const commonCssPath = path.join(context.extensionPath, 'src', 'webview', 'common', 'common.css');
        const commonCssUri = panel.webview.asWebviewUri(vscode.Uri.file(commonCssPath));
        htmlContent = htmlContent.replace('href="../common/common.css"', `href="${commonCssUri}"`);
        // Page-specific CSS
        const pageCssPath = path.join(context.extensionPath, 'src', 'webview', 'workflow_editor', 'workflow_editor.css');
        const pageCssUri = panel.webview.asWebviewUri(vscode.Uri.file(pageCssPath));
        htmlContent = htmlContent.replace('href="workflow_editor.css"', `href="${pageCssUri}"`);
        return htmlContent;
    }
}
function deactivate() {
    console.log('📴 GitHub Actions 확장 종료됨');
}
