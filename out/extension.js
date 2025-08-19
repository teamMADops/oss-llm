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
const path = __importStar(require("path"));
const getRepoInfo_1 = require("./github/getRepoInfo");
const githubSession_1 = require("./auth/githubSession");
const getRunList_1 = require("./github/getRunList");
const printToOutput_1 = require("./output/printToOutput");
const getFailedLogs_1 = require("./log/getFailedLogs");
const analyze_1 = require("./llm/analyze");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Webview panel management - Keep track of panels to prevent duplicates
const panels = {};
// 맨 위 유틸 추가: 숫자 여부 체크
const isNumeric = (s) => typeof s === 'string' && /^\d+$/.test(s);
/**
 * Creates and shows a new webview panel, or reveals an existing one.
 * Manages panel lifecycle and communication between the extension and the webview.
 * @param context The extension context.
 * @param page The page to display in the webview ('dashboard', 'editor', 'history').
 */
function createAndShowWebview(context, page) {
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
    const pageTitle = `MAD Ops: ${page.charAt(0).toUpperCase() + page.slice(1)}`;
    // If we already have a panel for this page, show it.
    if (panels[page]) {
        panels[page].reveal(column);
        // Also send a message to ensure the correct page is displayed, in case the user changed it.
        panels[page].webview.postMessage({ command: 'changePage', page });
        return;
    }
    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(page, // This is the viewType, used internally to identify the panel type
    pageTitle, // This is the title displayed to the user
    column || vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true, // Keep the state of the webview even when it's not visible
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out', 'webview-build'))]
    });
    panel.webview.html = getWebviewContent(context, panel);
    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
        //github auto auth-login
        const octokit = await (0, githubSession_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage('GitHub 로그인에 실패했습니다.');
            return;
        }
        console.log('[3] 🔑 VS Code GitHub 세션 확보');
        // All messages from the webview will be handled here.
        // This is where the API layer described in structure.md is implemented on the extension side.
        const repo = await (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            panel.webview.postMessage({ command: 'error', payload: 'GitHub 리포지토리 정보를 찾을 수 없습니다.' });
            return;
        }
        switch (message.command) {
            // These are placeholders for the API calls defined in structure.md
            case 'getActions':
                try {
                    // GitHub 워크플로우 파일 목록 가져오기
                    const { data: workflows } = await octokit.actions.listRepoWorkflows({
                        owner: repo.owner,
                        repo: repo.repo
                    });
                    console.log(`[📋] 워크플로우 개수: ${workflows.workflows.length}`);
                    if (workflows.workflows.length === 0) {
                        console.log('[⚠️] 워크플로우 파일이 없습니다.');
                        panel.webview.postMessage({
                            command: 'getActionsResponse',
                            payload: []
                        });
                        return;
                    }
                    // ✅ 경로 기반 키 사용 (경로가 없으면 id 문자열 fallback)
                    const actions = (workflows.workflows ?? []).map(w => {
                        const key = w.path || String(w.id);
                        return {
                            // 프론트에서 기존 필드명(actionId)을 그대로 쓰되, 값은 "경로"로 보냄
                            actionId: key,
                            id: String(w.id), // 참고용
                            path: w.path ?? null, // 참고용
                            name: w.name ?? key,
                            status: w.state === 'active' ? 'success' : 'failed'
                        };
                    });
                    console.log(`[✅] 워크플로우 목록:`, actions);
                    panel.webview.postMessage({
                        command: 'getActionsResponse',
                        payload: actions
                    });
                }
                catch (error) {
                    console.error('Error fetching actions:', error);
                    panel.webview.postMessage({
                        command: 'error',
                        payload: '워크플로우 목록을 가져오는데 실패했습니다.'
                    });
                }
                break;
            case 'getLatestRun':
                try {
                    const actionId = message.payload?.actionId;
                    if (!actionId) {
                        panel.webview.postMessage({
                            command: 'error',
                            payload: 'Action ID가 필요합니다.'
                        });
                        return;
                    }
                    // ✅ 경로 또는 숫자 id 모두 허용
                    const workflowIdOrPath = String(actionId);
                    // 특정 워크플로우의 최신 실행 가져오기
                    const { data: runs } = await octokit.actions.listWorkflowRuns({
                        owner: repo.owner,
                        repo: repo.repo,
                        // GitHub API는 문자열 경로('.github/workflows/ci.yml') 또는 숫자 id 모두 허용
                        workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : workflowIdOrPath,
                        per_page: 1
                    });
                    if (runs.workflow_runs.length > 0) {
                        const run = runs.workflow_runs[0];
                        const latestRun = {
                            id: run.id.toString(),
                            status: run.status,
                            conclusion: run.conclusion || 'unknown',
                            timestamp: run.created_at,
                            reason: run.head_commit?.message || 'Unknown'
                        };
                        panel.webview.postMessage({
                            command: 'getLatestRunResponse',
                            payload: latestRun
                        });
                    }
                    else {
                        panel.webview.postMessage({
                            command: 'getLatestRunResponse',
                            payload: null
                        });
                    }
                }
                catch (error) {
                    console.error('Error fetching latest run:', error);
                    panel.webview.postMessage({
                        command: 'error',
                        payload: '최신 실행 정보를 가져오는데 실패했습니다.'
                    });
                }
                break;
            case 'getRunHistory':
                try {
                    const actionId = message.payload?.actionId;
                    if (!actionId) {
                        panel.webview.postMessage({
                            command: 'error',
                            payload: 'Action ID가 필요합니다.'
                        });
                        return;
                    }
                    const workflowIdOrPath = String(actionId); // ← 그대로 사용
                    console.log(`[🔍] 워크플로우 ${workflowIdOrPath} 실행 기록 조회 (owner=${repo.owner}, repo=${repo.repo})`);
                    // 특정 워크플로우의 실행 기록 가져오기
                    const { data: runs } = await octokit.actions.listWorkflowRuns({
                        owner: repo.owner,
                        repo: repo.repo,
                        workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : workflowIdOrPath,
                        per_page: 10
                    });
                    console.log(`[📊] 실행 기록 개수: ${runs.workflow_runs.length}`);
                    const runHistory = runs.workflow_runs.map(run => ({
                        id: run.id.toString(),
                        status: run.status,
                        conclusion: run.conclusion || 'unknown',
                        timestamp: run.created_at,
                        reason: run.head_commit?.message || 'Unknown',
                        branch: run.head_branch
                    }));
                    panel.webview.postMessage({
                        command: 'getRunHistoryResponse',
                        payload: runHistory
                    });
                }
                catch (error) {
                    console.error('Error fetching run history:', error);
                    panel.webview.postMessage({
                        command: 'error',
                        payload: '실행 기록을 가져오는데 실패했습니다.'
                    });
                }
                break;
            case 'getWorkflowFile':
                try {
                    const actionId = message.payload?.actionId;
                    if (!actionId) {
                        panel.webview.postMessage({
                            command: 'error',
                            payload: 'Action ID가 필요합니다.'
                        });
                        return;
                    }
                    const workflowIdOrPath = String(actionId);
                    // ✅ getWorkflow도 경로/ID 모두 허용
                    const { data: workflow } = await octokit.actions.getWorkflow({
                        owner: repo.owner,
                        repo: repo.repo,
                        workflow_id: isNumeric(workflowIdOrPath) ? Number(workflowIdOrPath) : workflowIdOrPath
                    });
                    // 여기서는 기본 정보만 반환
                    panel.webview.postMessage({
                        command: 'getWorkflowFileResponse',
                        payload: workflow.path
                    });
                }
                catch (error) {
                    console.error('Error fetching workflow file:', error);
                    const hint = error?.status === 404
                        ? ' (이 레포에 해당 워크플로가 없거나 권한 문제일 수 있습니다.)'
                        : '';
                    panel.webview.postMessage({
                        command: 'error',
                        payload: '워크플로우 파일을 가져오는데 실패했습니다.' + hint
                    });
                }
                break;
            case 'saveWorkflowFile':
                // TODO: 워크플로우 파일 저장 로직 구현
                panel.webview.postMessage({
                    command: 'error',
                    payload: '워크플로우 파일 저장은 아직 구현되지 않았습니다.'
                });
                break;
            // [ADD] Webview로부터 LLM 분석 요청 처리
            // TODO : 추가한 webview에서 LLM 분석을 위해 요청하는 case
            case 'analyzeRun':
                try {
                    const runIdStr = message.payload?.runId;
                    if (typeof runIdStr !== 'string') {
                        panel.webview.postMessage({
                            command: 'error',
                            payload: 'Run ID가 문자열이 아닙니다.'
                        });
                        return;
                    }
                    const runId = parseInt(runIdStr, 10);
                    if (isNaN(runId)) {
                        panel.webview.postMessage({
                            command: 'error',
                            payload: `잘못된 Run ID 형식입니다: ${runIdStr}`
                        });
                        return;
                    }
                    console.log(`[🚀] Webview로부터 LLM 분석 요청 수신 (Run ID: ${runId})`);
                    // TODO : 여기서 triggerLlmAnalysis 사용, 이를 적절하게 대체 필요!
                    // await triggerLlmAnalysis(context, repo, runId);
                    // ✅ 커맨드 경로의 LLM 분석 블록을 그대로 사용 (변수명만 맞춤)
                    const logMode = message.payload?.logMode === 'all' ? 'all' : 'error';
                    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Run #${runId} 분석 중...` }, async (progress) => {
                        try {
                            progress.report({ message: '로그 ZIP 다운로드 및 프롬프트 생성 중' });
                            const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, runId, logMode);
                            (0, printToOutput_1.printToOutput)(`Run #${runId} 실패한 Step 목록`, failedSteps);
                            (0, printToOutput_1.printToOutput)(`Run #${runId} → LLM 프롬프트`, prompts);
                            if (prompts.length === 0) {
                                panel.webview.postMessage({
                                    command: 'llmAnalysisResult',
                                    payload: { runId, summary: '분석할 로그가 없습니다.', rootCause: null, suggestion: null, items: [] }
                                });
                                vscode.window.showInformationMessage('분석할 로그가 없습니다.');
                                return;
                            }
                            progress.report({ message: 'LLM 호출 중' });
                            const analysis = await (0, analyze_1.analyzePrompts)(prompts);
                            (0, printToOutput_1.printToOutput)('LLM 분석 결과', [JSON.stringify(analysis, null, 2)]);
                            // 여기서는 현재 열려있는 대시보드로 보내거나, 바로 이 패널로 회신 둘 중 택1
                            if (panels['dashboard']) {
                                panels['dashboard'].webview.postMessage({
                                    command: 'llmAnalysisResult',
                                    payload: { runId, ...analysis }
                                });
                            }
                            else {
                                panel.webview.postMessage({
                                    command: 'llmAnalysisResult',
                                    payload: { runId, ...analysis }
                                });
                            }
                        }
                        catch (e) {
                            const msg = e?.message ?? String(e);
                            panel.webview.postMessage({ command: 'error', payload: `LLM 분석 실패: ${msg}` });
                            vscode.window.showErrorMessage(`❌ 분석 실패: ${msg}`);
                        }
                    });
                }
                catch (error) {
                    console.error('LLM 분석 시작 중 오류 발생:', error);
                    panel.webview.postMessage({
                        command: 'error',
                        payload: 'LLM 분석을 시작하는 데 실패했습니다.'
                    });
                }
                break;
            case 'analyzeLog':
                panel.webview.postMessage({
                    command: 'error',
                    payload: '로그 분석은 아직 구현되지 않았습니다.'
                });
                break;
        }
    }, undefined, context.subscriptions);
    // Handle when the panel is closed
    panel.onDidDispose(() => {
        delete panels[page];
    }, null, context.subscriptions);
    // Store the panel and send the initial page message
    panels[page] = panel;
    panel.webview.postMessage({ command: 'changePage', page });
}
function activate(context) {
    // 🔑 .env를 확실히 로드 (package.json이 있는 확장 루트)
    const envPath = path.join(context.extensionPath, '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
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
    const disposable = vscode.commands.registerCommand('extension.analyzeGitHubActions', async (repoArg) => {
        console.log('[1] 🔍 확장 실행됨');
        // 우선순위: 명령 인자 > 저장된 레포
        const repo = repoArg ?? (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            vscode.window.showWarningMessage('저장된 레포가 없습니다. 먼저 레포를 등록하세요.');
            return;
        }
        console.log(`[2] ✅ 레포: ${repo.owner}/${repo.repo}`);
        // GitHub 인증 세션 가져오기
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
        console.log(`[4] ✅ 선택된 Run ID: ${run_id}`);
        const mode = await vscode.window.showQuickPick(['전체 로그', '에러 메세지만'], {
            placeHolder: 'LLM 프롬프트에 포함할 로그 범위 선택'
        });
        const logMode = mode === '전체 로그' ? 'all' : 'error';
        console.log(`[5] 📄 로그 추출 방식: ${logMode}`);
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Run #${run_id} 분석 중...` }, async (progress) => {
            try {
                progress.report({ message: '로그 ZIP 다운로드 및 프롬프트 생성 중' });
                const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, run_id, logMode);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} 실패한 Step 목록`, failedSteps);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} → LLM 프롬프트`, prompts);
                if (prompts.length === 0) {
                    vscode.window.showInformationMessage('분석할 로그가 없습니다.');
                    return;
                }
                progress.report({ message: 'LLM 호출 중' });
                const analysis = await (0, analyze_1.analyzePrompts)(prompts); // { summary, rootCause, suggestion }
                // 출력창에 결과 덤프(선택)
                (0, printToOutput_1.printToOutput)('LLM 분석 결과', [JSON.stringify(analysis, null, 2)]);
                // 웹뷰로 LLM 분석 결과 전송
                if (panels['dashboard']) {
                    panels['dashboard'].webview.postMessage({
                        command: 'llmAnalysisResult',
                        payload: analysis
                    });
                    vscode.window.showInformationMessage('LLM 분석 결과가 대시보드에 표시되었습니다.');
                }
                else {
                    const summary = analysis.summary ?? 'LLM 분석이 완료되었습니다.';
                    const choice = await vscode.window.showInformationMessage(`🧠 ${summary}`, '출력창 열기', '요약 복사');
                    if (choice === '출력창 열기') {
                        vscode.commands.executeCommand('workbench.action.output.toggleOutput');
                    }
                    else if (choice === '요약 복사') {
                        await vscode.env.clipboard.writeText(summary);
                        vscode.window.showInformationMessage('📋 요약을 클립보드에 복사했어요.');
                    }
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`❌ 분석 실패: ${e?.message ?? e}`);
            }
        });
    });
    context.subscriptions.push(disposable);
    // --- Webview Commands ---
    // Main command to open the webview dashboard
    context.subscriptions.push(vscode.commands.registerCommand('extension.openDashboard', () => {
        createAndShowWebview(context, 'dashboard');
    }));
}
function getWebviewContent(context, panel) {
    const buildPath = path.join(context.extensionPath, 'out', 'webview-build');
    const scriptPath = path.join(buildPath, 'assets', 'index.js');
    const stylePath = path.join(buildPath, 'assets', 'index.css');
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
    const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(stylePath));
    const nonce = getNonce();
    // The title here is for the HTML document itself, not the panel tab.
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
      <title>MAD Ops</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function deactivate() {
    console.log('📴 GitHub Actions 확장 종료됨');
}
