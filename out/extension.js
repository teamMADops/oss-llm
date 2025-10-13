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
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const github_1 = require("./github");
const getRunList_1 = require("./github/getRunList");
const printToOutput_1 = require("./output/printToOutput");
const getFailedLogs_1 = require("./log/getFailedLogs");
const analyze_1 = require("./llm/analyze");
const secondPass_1 = require("./llm/secondPass");
const llmCache_1 = require("./llm/cache/llmCache");
const pinpointCache_1 = require("./llm/cache/pinpointCache");
function activate(context) {
    // 캐시 초기화 (한 번만)
    try {
        llmCache_1.llmCache.init(context);
        pinpointCache_1.pinpointCache.init(context);
        console.log("[MAD Ops] LLM 캐시 초기화 완료");
    }
    catch (e) {
        console.error("⚠️ 캐시 초기화 실패:", e);
    }
    const functionRegister = (functionHandler) => {
        const cmd = vscode.commands.registerCommand(`extension.${functionHandler.name}`, functionHandler);
        context.subscriptions.push(cmd);
    };
    const setOpenAiKey = async () => {
        const key = await vscode.window.showInputBox({
            prompt: "Enter your OpenAI API key",
            ignoreFocusOut: true,
            password: true,
        });
        if (key) {
            await context.secrets.store("openaiApiKey", key);
            vscode.window.showInformationMessage("✅ OpenAI API key stored successfully.");
        }
    };
    functionRegister(setOpenAiKey);
    const clearOpenAiKey = async () => {
        await context.secrets.delete("openaiApiKey");
        vscode.window.showInformationMessage("🗑️ OpenAI API key successfully deleted.");
    };
    functionRegister(clearOpenAiKey);
    const setRepository = async () => (0, github_1.saveRepo)(context);
    functionRegister(setRepository);
    const clearRepository = async () => (0, github_1.deleteSavedRepo)(context);
    functionRegister(clearRepository);
    const showRepository = async () => {
        const cur = (0, github_1.getSavedRepoInfo)(context);
        vscode.window.showInformationMessage(`Current repository: ${cur ? cur.owner + "/" + cur.repo : "(none)"}`);
    };
    functionRegister(showRepository);
    const loginGithub = async () => {
        const before = await (0, github_1.getExistingGitHubSession)();
        const ok = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (ok) {
            const after = await (0, github_1.getExistingGitHubSession)();
            const who = after?.account?.label ?? "GitHub";
            vscode.window.showInformationMessage(before ? `You are already logged in as ${who}` : `Successfully logged in as ${who}`);
        }
        else {
            vscode.window.showErrorMessage("GitHub login failed.");
        }
    };
    functionRegister(loginGithub);
    const logoutGithub = async () => {
        const session = await (0, github_1.getExistingGitHubSession)();
        if (!session) {
            vscode.window.showInformationMessage("You are not logged in.");
            return;
        }
        const isSignOut = await (0, github_1.isSignOutGitHub)();
        if (isSignOut) {
            vscode.window.showInformationMessage("GitHub logout successful.");
        }
    };
    functionRegister(logoutGithub);
    const analyzeGitHubActions = async (repoArg) => {
        console.log("[1] 🔍 확장 실행됨");
        // 우선순위: 명령 인자 > 저장된 레포
        const repo = repoArg ?? (0, github_1.getSavedRepoInfo)(context);
        if (!repo) {
            vscode.window.showWarningMessage("No repository found. Please register one first.");
            return;
        }
        console.log(`[2] ✅ Repository: ${repo.owner}/${repo.repo}`);
        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage("GitHub login failed.");
            return;
        }
        console.log("[3] 🔑 VS Code GitHub 세션 확보");
        const run_id = await (0, getRunList_1.getRunIdFromQuickPick)(octokit, repo.owner, repo.repo);
        if (!run_id) {
            vscode.window.showInformationMessage("No workflow run selected.");
            return;
        }
        console.log(`[4] ✅ Selected Run ID: ${run_id}`);
        const mode = await vscode.window.showQuickPick(["All logs", "Error messages only"], {
            placeHolder: "Select log scope to include in LLM prompt",
        });
        const logMode = mode === "All logs" ? "all" : "error";
        console.log(`[5] 📄 로그 추출 방식: ${logMode}`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Analyzing Run #${run_id}...`,
        }, async (progress) => {
            try {
                progress.report({
                    message: "Downloading log ZIP and generating prompts",
                });
                const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, run_id, logMode);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} failed steps`, failedSteps);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} → LLM prompts`, prompts);
                if (prompts.length === 0) {
                    vscode.window.showInformationMessage("No logs available for analysis.");
                    return;
                }
                progress.report({ message: "Calling LLM" });
                const analysis = await (0, analyze_1.analyzePrompts)(context, prompts); // { summary, rootCause, suggestion }
                (0, printToOutput_1.printToOutput)("LLM analysis result", [JSON.stringify(analysis, null, 2)]);
                if (panels["dashboard"]) {
                    panels["dashboard"].webview.postMessage({
                        command: "llmAnalysisResult",
                        payload: analysis,
                    });
                    vscode.window.showInformationMessage("LLM analysis result has been displayed on the dashboard.");
                }
                else {
                    const summary = analysis.summary ?? "LLM analysis complete.";
                    const choice = await vscode.window.showInformationMessage(`🧠 ${summary}`, "Open Output Panel", "Copy Summary");
                    if (choice === "Open Output Panel") {
                        vscode.commands.executeCommand("workbench.action.output.toggleOutput");
                    }
                    else if (choice === "Copy Summary") {
                        await vscode.env.clipboard.writeText(summary);
                        vscode.window.showInformationMessage("📋 Summary has been copied to clipboard.");
                    }
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`❌ Analysis failed: ${e?.message ?? e}`);
            }
        });
    };
    functionRegister(analyzeGitHubActions);
    const openDashboard = async () => {
        createAndShowWebview(context, "dashboard");
    };
    functionRegister(openDashboard);
    // Extension 활성화 시 자동으로 대시보드 열기
    setTimeout(() => {
        openDashboard();
    }, 100);
}
const panels = {};
const isNumeric = (s) => typeof s === "string" && /^\d+$/.test(s);
/**
 * Creates and shows a new webview panel, or reveals an existing one.
 * Manages panel lifecycle and communication between the extension and the webview.
 * @param context The extension context.
 * @param page The page to display in the webview ('dashboard', 'editor', 'history').
 */
function createAndShowWebview(context, page) {
    console.log(`[extension.ts] 웹뷰 생성 시작: ${page}`);
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
    const pageTitle = `MAD Ops: ${page.charAt(0).toUpperCase() + page.slice(1)}`;
    // If we already have a panel for this page, show it.
    if (panels[page]) {
        console.log(`[extension.ts] 기존 패널 사용: ${page}`);
        panels[page].reveal(column);
        // Also send a message to ensure the correct page is displayed, in case the user changed it.
        panels[page].webview.postMessage({ command: "changePage", page });
        return;
    }
    console.log(`[extension.ts] 새 웹뷰 패널 생성: ${pageTitle}`);
    const panel = vscode.window.createWebviewPanel(page, pageTitle, column || vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "out", "webview-build")),
        ],
    });
    console.log(`[extension.ts] 웹뷰 HTML 설정 중...`);
    panel.webview.html = getWebviewContent(context, panel);
    console.log(`[extension.ts] 웹뷰 HTML 설정 완료`);
    panel.webview.onDidReceiveMessage(async (message) => {
        // Settings 관련 메시지 처리 (GitHub 인증 불필요)
        console.log('[extension.ts] 받은 메시지:', message.command, message);
        switch (message.command) {
            case 'checkSettings': {
                // 초기 설정 확인
                console.log('[extension.ts] 설정 확인 중...');
                const githubSession = await (0, github_1.getExistingGitHubSession)();
                const savedRepo = (0, github_1.getSavedRepoInfo)(context);
                const hasOpenAiKey = !!(await context.secrets.get("openaiApiKey"));
                console.log('[extension.ts] 설정 상태:', {
                    hasGithubSession: !!githubSession,
                    hasSavedRepo: !!savedRepo,
                    hasOpenAiKey
                });
                const isConfigured = githubSession && savedRepo && hasOpenAiKey;
                // 실제 설정 데이터를 모달에 전달
                console.log('[extension.ts] 설정 모달 표시 요청');
                // API 키 가져오기 (실제 값 전달)
                let apiKeyValue = '';
                if (hasOpenAiKey) {
                    const actualKey = await context.secrets.get("openaiApiKey");
                    if (actualKey) {
                        apiKeyValue = actualKey;
                    }
                }
                // GitHub 사용자 정보 가져오기
                let githubUserInfo = null;
                if (githubSession) {
                    try {
                        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
                        if (octokit) {
                            const { data: user } = await octokit.rest.users.getAuthenticated();
                            githubUserInfo = {
                                username: user.login,
                                avatarUrl: user.avatar_url,
                                name: user.name || user.login
                            };
                        }
                    }
                    catch (error) {
                        console.error('[extension.ts] GitHub 사용자 정보 가져오기 실패:', error);
                        githubUserInfo = {
                            username: githubSession.account.label,
                            avatarUrl: '',
                            name: githubSession.account.label
                        };
                    }
                }
                const currentSettings = {
                    githubAuthenticated: !!githubSession,
                    githubUser: githubUserInfo,
                    openaiApiKey: apiKeyValue, // 실제 API 키 전달 (눈 아이콘으로 보이기/숨기기 가능)
                    repositoryUrl: savedRepo ? `${savedRepo.owner}/${savedRepo.repo}` : '',
                };
                console.log('[extension.ts] 전달할 설정 데이터:', currentSettings);
                // 설정이 완료되지 않았을 때만 모달 표시
                if (!isConfigured) {
                    console.log('[extension.ts] 설정이 완료되지 않음 - 초기 설정 모달 표시');
                    panel.webview.postMessage({
                        command: "showSettings",
                        payload: {
                            isInitialSetup: true,
                            currentSettings: currentSettings
                        }
                    });
                }
                else {
                    console.log('[extension.ts] 설정이 이미 완료되어 있음 - 모달 표시하지 않음');
                }
                return;
            }
            case 'openSettings': {
                // 사용자가 수동으로 설정 버튼을 클릭했을 때 (항상 모달 표시)
                console.log('[extension.ts] 수동 설정 열기 요청');
                const githubSession = await (0, github_1.getExistingGitHubSession)();
                const savedRepo = (0, github_1.getSavedRepoInfo)(context);
                const hasOpenAiKey = !!(await context.secrets.get("openaiApiKey"));
                // API 키 가져오기
                let apiKeyValue = '';
                if (hasOpenAiKey) {
                    const actualKey = await context.secrets.get("openaiApiKey");
                    if (actualKey) {
                        apiKeyValue = actualKey;
                    }
                }
                // GitHub 사용자 정보 가져오기
                let githubUserInfo = null;
                if (githubSession) {
                    try {
                        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
                        if (octokit) {
                            const { data: user } = await octokit.rest.users.getAuthenticated();
                            githubUserInfo = {
                                username: user.login,
                                avatarUrl: user.avatar_url,
                                name: user.name || user.login
                            };
                        }
                    }
                    catch (error) {
                        console.error('[extension.ts] GitHub 사용자 정보 가져오기 실패:', error);
                        githubUserInfo = {
                            username: githubSession.account.label,
                            avatarUrl: '',
                            name: githubSession.account.label
                        };
                    }
                }
                const currentSettings = {
                    githubAuthenticated: !!githubSession,
                    githubUser: githubUserInfo,
                    openaiApiKey: apiKeyValue,
                    repositoryUrl: savedRepo ? `${savedRepo.owner}/${savedRepo.repo}` : '',
                };
                console.log('[extension.ts] 수동 설정 모달 표시');
                panel.webview.postMessage({
                    command: "showSettings",
                    payload: {
                        isInitialSetup: false, // 수동 열기이므로 초기 설정이 아님
                        currentSettings: currentSettings
                    }
                });
                return;
            }
            case 'requestGithubLogin': {
                // GitHub 로그인 요청
                console.log('[extension.ts] GitHub 로그인 요청 받음');
                try {
                    const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
                    if (octokit) {
                        const session = await (0, github_1.getExistingGitHubSession)();
                        // GitHub API로 사용자 정보 가져오기
                        try {
                            const { data: user } = await octokit.rest.users.getAuthenticated();
                            panel.webview.postMessage({
                                command: "githubLoginResult",
                                payload: {
                                    success: true,
                                    username: user.login,
                                    avatarUrl: user.avatar_url,
                                    name: user.name || user.login
                                }
                            });
                        }
                        catch (apiError) {
                            // API 호출 실패 시 세션 정보만 사용
                            panel.webview.postMessage({
                                command: "githubLoginResult",
                                payload: {
                                    success: true,
                                    username: session?.account?.label || 'GitHub User',
                                    avatarUrl: '',
                                    name: session?.account?.label || 'GitHub User'
                                }
                            });
                        }
                    }
                    else {
                        panel.webview.postMessage({
                            command: "githubLoginResult",
                            payload: {
                                success: false,
                                error: 'GitHub 로그인에 실패했습니다.'
                            }
                        });
                    }
                }
                catch (error) {
                    panel.webview.postMessage({
                        command: "githubLoginResult",
                        payload: {
                            success: false,
                            error: error?.message || 'GitHub 로그인 중 오류가 발생했습니다.'
                        }
                    });
                }
                return;
            }
            case 'openExternalUrl': {
                // 외부 URL 열기
                const url = message.payload?.url;
                if (url) {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
                return;
            }
            case 'saveSettings': {
                // 설정 저장
                console.log('[extension.ts] 설정 저장 요청 받음:', message.payload);
                try {
                    const { openaiApiKey, repositoryUrl } = message.payload;
                    // OpenAI API 키 저장 (실제 값이 있을 때만)
                    if (openaiApiKey && openaiApiKey.trim()) {
                        await context.secrets.store("openaiApiKey", openaiApiKey);
                    }
                    // 레포지토리 정보 저장
                    if (repositoryUrl) {
                        const repoInfo = await Promise.resolve().then(() => __importStar(require('./github/repository/normalizeInputAsRepoInfo')));
                        const normalized = repoInfo.default(repositoryUrl);
                        if (normalized) {
                            const KEY = (await Promise.resolve().then(() => __importStar(require('./github/repository/Constants')))).KEY;
                            await context.globalState.update(KEY, `${normalized.owner}/${normalized.repo}`);
                        }
                    }
                    // 저장 완료 메시지
                    console.log('[extension.ts] 설정 저장 완료, 웹뷰에 알림');
                    console.log('[extension.ts] settingsSaved 메시지 전송 중...');
                    panel.webview.postMessage({
                        command: "settingsSaved",
                        payload: { success: true }
                    });
                    console.log('[extension.ts] settingsSaved 메시지 전송 완료');
                    vscode.window.showInformationMessage("✅ Settings saved successfully.");
                }
                catch (error) {
                    panel.webview.postMessage({
                        command: "error",
                        payload: `Failed to save settings: ${error?.message || error}`
                    });
                    vscode.window.showErrorMessage(`Failed to save settings: ${error?.message || error}`);
                }
                return;
            }
        }
        // 기존 메시지 처리 (GitHub 인증 필요)
        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage("Failed to authenticate with GitHub.");
            return;
        }
        console.log("[3] 🔑 VS Code GitHub session acquired");
        const repo = (0, github_1.getSavedRepoInfo)(context);
        if (!repo) {
            panel.webview.postMessage({
                command: "error",
                payload: "Failed to find GitHub repository information.",
            });
            return;
        }
        switch (message.command) {
            case "getActions":
                try {
                    const { data: workflows } = await octokit.actions.listRepoWorkflows({
                        owner: repo.owner,
                        repo: repo.repo,
                    });
                    console.log(`[📋] 워크플로우 개수: ${workflows.workflows.length}`);
                    if (workflows.workflows.length === 0) {
                        console.log("[⚠️] 워크플로우 파일이 없습니다.");
                        panel.webview.postMessage({
                            command: "getActionsResponse",
                            payload: [],
                        });
                        return;
                    }
                    const actions = (workflows.workflows ?? []).map((w) => {
                        const key = w.path || String(w.id);
                        return {
                            // 프론트에서 기존 필드명(actionId)을 그대로 쓰되, 값은 "경로"로 보냄
                            actionId: key,
                            id: String(w.id), // 참고용
                            path: w.path ?? null, // 참고용
                            name: w.name ?? key,
                            status: w.state === "active" ? "success" : "failed",
                        };
                    });
                    console.log(`[✅] 워크플로우 목록:`, actions);
                    send(panel, "getActionsResponse", actions);
                }
                catch (error) {
                    console.error("Error fetching actions:", error);
                    send(panel, "error", "워크플로우 목록을 가져오는데 실패했습니다.");
                }
                break;
            case "getLatestRun":
                try {
                    const actionId = message.payload?.actionId;
                    if (!actionId) {
                        send(panel, "error", "Action ID가 필요합니다.");
                        return;
                    }
                    const workflowIdOrPath = String(actionId);
                    const { data: runs } = await octokit.actions.listWorkflowRuns({
                        owner: repo.owner,
                        repo: repo.repo,
                        // GitHub API는 문자열 경로('.github/workflows/ci.yml') 또는 숫자 id 모두 허용
                        workflow_id: isNumeric(workflowIdOrPath)
                            ? Number(workflowIdOrPath)
                            : workflowIdOrPath,
                        per_page: 1,
                    });
                    if (runs.workflow_runs.length > 0) {
                        const run = runs.workflow_runs[0];
                        const latestRun = {
                            id: run.id.toString(),
                            status: run.status,
                            conclusion: run.conclusion || "unknown",
                            timestamp: run.created_at,
                            reason: run.head_commit?.message || "Unknown",
                        };
                        send(panel, "getLatestRunResponse", latestRun);
                    }
                    else {
                        send(panel, "getLatestRunResponse", null);
                    }
                }
                catch (error) {
                    console.error("Error fetching latest run:", error);
                    send(panel, "error", "최신 실행 정보를 가져오는데 실패했습니다.");
                }
                break;
            case "getRunHistory":
                try {
                    const actionId = message.payload?.actionId;
                    if (!actionId) {
                        send(panel, "error", "Action ID가 필요합니다.");
                        return;
                    }
                    const workflowIdOrPath = String(actionId);
                    console.log(`[🔍] 워크플로우 ${workflowIdOrPath} 실행 기록 조회 (owner=${repo.owner}, repo=${repo.repo})`);
                    const { data: runs } = await octokit.actions.listWorkflowRuns({
                        owner: repo.owner,
                        repo: repo.repo,
                        workflow_id: isNumeric(workflowIdOrPath)
                            ? Number(workflowIdOrPath)
                            : workflowIdOrPath,
                        per_page: 10,
                    });
                    console.log(`[📊] 실행 기록 개수: ${runs.workflow_runs.length}`);
                    const runHistory = runs.workflow_runs.map((run) => ({
                        id: run.id.toString(),
                        status: run.status,
                        conclusion: run.conclusion || "unknown",
                        timestamp: run.created_at,
                        reason: run.head_commit?.message || "Unknown",
                        branch: run.head_branch,
                        commit: run.head_sha?.substring(0, 7) || "Unknown",
                        author: run.head_commit?.author?.name || "Unknown",
                    }));
                    send(panel, "getRunHistoryResponse", runHistory);
                }
                catch (error) {
                    console.error("Error fetching run history:", error);
                    send(panel, "error", "실행 기록을 가져오는데 실패했습니다.");
                }
                break;
            case "getLatestRunFromAllActions":
                try {
                    console.log(`[🔍] 모든 actions 중 가장 최근 run 조회 (owner=${repo.owner}, repo=${repo.repo})`);
                    const { data: workflows } = await octokit.actions.listRepoWorkflows({
                        owner: repo.owner,
                        repo: repo.repo,
                    });
                    let latestRun = null;
                    let latestTimestamp = 0;
                    for (const workflow of workflows.workflows) {
                        try {
                            const { data: runs } = await octokit.actions.listWorkflowRuns({
                                owner: repo.owner,
                                repo: repo.repo,
                                workflow_id: workflow.id,
                                per_page: 1,
                            });
                            if (runs.workflow_runs.length > 0) {
                                const run = runs.workflow_runs[0];
                                const runTimestamp = new Date(run.created_at).getTime();
                                if (runTimestamp > latestTimestamp) {
                                    latestTimestamp = runTimestamp;
                                    latestRun = {
                                        id: run.id.toString(),
                                        status: run.status,
                                        conclusion: run.conclusion,
                                        timestamp: run.created_at,
                                        reason: run.head_commit?.message || "Unknown",
                                        actionId: workflow.path || workflow.id.toString(),
                                    };
                                }
                            }
                        }
                        catch (workflowError) {
                            console.log(`워크플로우 ${workflow.id} 실행 기록 조회 실패:`, workflowError);
                        }
                    }
                    console.log(`[✅] 가장 최근 run:`, latestRun);
                    send(panel, "getLatestRunFromAllActionsResponse", latestRun);
                }
                catch (error) {
                    console.error("Error fetching latest run from all actions:", error);
                    send(panel, "error", "가장 최근 실행 정보를 가져오는데 실패했습니다.");
                }
                break;
            case "getRunDetails":
                try {
                    const runId = message.payload?.runId;
                    if (!runId) {
                        send(panel, "error", "Run ID가 필요합니다.");
                        return;
                    }
                    console.log(`[🔍] Run 상세 정보 조회: ${runId} (owner=${repo.owner}, repo=${repo.repo})`);
                    const { data: run } = await octokit.actions.getWorkflowRun({
                        owner: repo.owner,
                        repo: repo.repo,
                        run_id: Number(runId),
                    });
                    const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
                        owner: repo.owner,
                        repo: repo.repo,
                        run_id: Number(runId),
                    });
                    const runDetails = {
                        id: run.id.toString(),
                        status: run.status,
                        conclusion: run.conclusion,
                        timestamp: run.created_at,
                        reason: run.head_commit?.message || "Unknown",
                        branch: run.head_branch || "Unknown",
                        workflow: run.name || "Unknown",
                        runNumber: run.run_number,
                        duration: "Unknown", // GitHub API에서 duration을 직접 제공하지 않음
                        commit: run.head_sha?.substring(0, 7) || "Unknown",
                        author: run.head_commit?.author?.name || "Unknown",
                        jobs: jobs.jobs,
                    };
                    console.log(`[✅] Run 상세 정보:`, runDetails);
                    send(panel, "getRunDetailsResponse", runDetails);
                }
                catch (error) {
                    console.error("Error fetching run details:", error);
                    send(panel, "error", "Run 상세 정보를 가져오는데 실패했습니다.");
                }
                break;
            case "getRunLogs":
                try {
                    const runId = message.payload?.runId;
                    if (!runId) {
                        send(panel, "error", "Run ID가 필요합니다.");
                        return;
                    }
                    console.log(`[🔍] Run 로그 다운로드: ${runId} (owner=${repo.owner}, repo=${repo.repo})`);
                    const { data: logs } = await octokit.request("GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs", {
                        owner: repo.owner,
                        repo: repo.repo,
                        run_id: Number(runId),
                        request: { responseType: "arraybuffer" },
                    });
                    const JSZip = require("jszip");
                    const zip = await JSZip.loadAsync(logs);
                    let allLogs = "";
                    const txtFiles = Object.values(zip.files).filter((f) => !f.dir && f.name.endsWith(".txt"));
                    for (const file of txtFiles) {
                        const content = await file.async("string");
                        allLogs += `=== ${file.name} ===\n${content}\n\n`;
                    }
                    console.log(`[✅] Run 로그 다운로드 완료: ${txtFiles.length}개 파일`);
                    send(panel, "getRunLogsResponse", allLogs);
                }
                catch (error) {
                    console.error("Error fetching run logs:", error);
                    // [FIX] 로그를 가져올 수 없을 때 에러 대신 안내 메시지 전송
                    const errorMsg = error?.status === 404
                        ? "로그를 찾을 수 없습니다. (로그가 만료되었거나, 아직 생성되지 않았거나, 진행 중일 수 있습니다)"
                        : `로그를 가져오는데 실패했습니다: ${error?.message || error}`;
                    send(panel, "getRunLogsResponse", errorMsg);
                }
                break;
            case "getWorkflowFile":
                async function getFileText(octokit, repo, filePath, ref = "main") {
                    const r = await octokit.repos.getContent({
                        owner: repo.owner,
                        repo: repo.repo,
                        path: filePath,
                        ref,
                    });
                    if (Array.isArray(r.data))
                        return "";
                    const base64 = r.data.content?.replace(/\n/g, "") ?? "";
                    return Buffer.from(base64, "base64").toString("utf8");
                }
                try {
                    const actionId = String(message.payload?.actionId);
                    if (!actionId) {
                        send(panel, "error", "Action ID가 필요합니다.");
                        return;
                    }
                    let workflowPath;
                    if (isNumericId(actionId)) {
                        const { data: wf } = await octokit.actions.getWorkflow({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: Number(actionId),
                        });
                        workflowPath = ensureWorkflowPathFromWorkflow(wf);
                    }
                    else {
                        // 경로(.github/workflows/xxx.yml) 그대로 사용 가능
                        workflowPath = actionId;
                    }
                    const content = await getFileText(octokit, repo, workflowPath, "main");
                    send(panel, "getWorkflowFileResponse", content);
                }
                catch (error) {
                    console.error("Error fetching workflow file:", error);
                    const hint = error?.status === 404
                        ? " (이 레포에 해당 워크플로가 없거나 권한 문제일 수 있습니다.)"
                        : "";
                    send(panel, "error", "워크플로우 파일을 가져오는데 실패했습니다." + hint);
                }
                break;
            case "saveWorkflowFile": {
                async function getFileShaIfExists(octokit, repo, filePath, ref = "main") {
                    try {
                        const r = await octokit.repos.getContent({
                            owner: repo.owner,
                            repo: repo.repo,
                            path: filePath,
                            ref,
                        });
                        if (Array.isArray(r.data))
                            return undefined;
                        return r.data.sha;
                    }
                    catch (e) {
                        if (e?.status === 404)
                            return undefined;
                        throw e;
                    }
                }
                async function upsertFile(octokit, repo, filePath, contentUtf8, branch = "main", message) {
                    const sha = await getFileShaIfExists(octokit, repo, filePath, branch);
                    await octokit.repos.createOrUpdateFileContents({
                        owner: repo.owner,
                        repo: repo.repo,
                        path: filePath,
                        message: message ?? `chore(ci): update ${filePath}`,
                        content: Buffer.from(contentUtf8, "utf8").toString("base64"),
                        branch,
                        sha, // 있으면 업데이트, 없으면 생성
                        committer: { name: "MAD Bot", email: "mad@team-madops.local" },
                        author: { name: "MAD Bot", email: "mad@team-madops.local" },
                    });
                }
                try {
                    const actionId = String(message.payload?.actionId);
                    const content = String(message.payload?.content ?? "");
                    if (!actionId)
                        throw new Error("Action ID가 필요합니다.");
                    let workflowPath;
                    if (isNumericId(actionId)) {
                        const { data: wf } = await octokit.actions.getWorkflow({
                            owner: repo.owner,
                            repo: repo.repo,
                            workflow_id: Number(actionId),
                        });
                        workflowPath = ensureWorkflowPathFromWorkflow(wf);
                    }
                    else {
                        workflowPath = actionId; // 이미 경로로 넘어옴 (.github/workflows/xxx.yml)
                    }
                    await upsertFile(octokit, repo, workflowPath, content, "main");
                    send(panel, "saveWorkflowFileResponse", {
                        ok: true,
                        path: workflowPath,
                    });
                }
                catch (error) {
                    // TODO: 보호 브랜치면 여기서 feature 브랜치/PR 폴백 추가 가능 : ?? 먼솔
                    send(panel, "saveWorkflowFileResponse", {
                        ok: false,
                        error: error?.message ?? String(error),
                    });
                }
                break;
            }
            case "analyzeRun":
                try {
                    const runIdStr = message.payload?.runId;
                    if (typeof runIdStr !== "string") {
                        send(panel, "error", "Run ID가 문자열이 아닙니다.");
                        return;
                    }
                    const runId = parseInt(runIdStr, 10);
                    if (isNaN(runId)) {
                        panel.webview.postMessage({
                            command: "error",
                            payload: `잘못된 Run ID 형식입니다: ${runIdStr}`,
                        });
                        return;
                    }
                    console.log(`[🚀] Webview로부터 LLM 분석 요청 수신 (Run ID: ${runId})`);
                    // [ADD] Run 상태 확인
                    const { data: run } = await octokit.actions.getWorkflowRun({
                        owner: repo.owner,
                        repo: repo.repo,
                        run_id: runId,
                    });
                    // [ADD] 성공한 workflow는 LLM 분석 없이 성공 메시지 전송
                    if (run.conclusion === "success") {
                        console.log(`[✅] Run #${runId}는 성공한 작업입니다.`);
                        const successResult = {
                            runId,
                            status: "success",
                            summary: "성공한 작업입니다!",
                            rootCause: "",
                            suggestion: "",
                        };
                        if (panels["dashboard"]) {
                            panels["dashboard"].webview.postMessage({
                                command: "llmAnalysisResult",
                                payload: successResult,
                            });
                        }
                        else {
                            send(panel, "llmAnalysisResult", successResult);
                        }
                        return;
                    }
                    // TODO : 여기서 triggerLlmAnalysis 사용, 이를 적절하게 대체 필요!
                    // await triggerLlmAnalysis(context, repo, runId);
                    // ✅ 커맨드 경로의 LLM 분석 블록을 그대로 사용 (변수명만 맞춤)
                    const logMode = message.payload?.logMode === "all" ? "all" : "error";
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Analyzing Run #${runId} ...`,
                    }, async (progress) => {
                        try {
                            progress.report({
                                message: "Downloading log ZIP and generating prompts...",
                            });
                            const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, runId, logMode);
                            (0, printToOutput_1.printToOutput)(`Run #${runId}  Failed steps`, failedSteps);
                            (0, printToOutput_1.printToOutput)(`Run #${runId} → LLM prompts`, prompts);
                            if (prompts.length === 0) {
                                send(panel, "llmAnalysisResult", {
                                    runId,
                                    summary: "No logs available for analysis.",
                                    rootCause: null,
                                    suggestion: null,
                                    items: [],
                                });
                                vscode.window.showInformationMessage("No logs available for analysis.");
                                return;
                            }
                            progress.report({ message: "Calling LLM..." });
                            // const analysis = await analyzePrompts(prompts);
                            const analysis = await (0, analyze_1.analyzePrompts)(context, prompts);
                            (0, printToOutput_1.printToOutput)("LLM 분석 결과", [
                                JSON.stringify(analysis, null, 2),
                            ]);
                            // [MOD] 성공적으로 분석된 결과에 status 추가
                            const resultWithStatus = {
                                runId,
                                status: "failure",
                                ...analysis,
                            };
                            // 여기서는 현재 열려있는 대시보드로 보내거나, 바로 이 패널로 회신 둘 중 택1
                            if (panels["dashboard"]) {
                                panels["dashboard"].webview.postMessage({
                                    command: "llmAnalysisResult",
                                    payload: resultWithStatus,
                                });
                            }
                            else {
                                send(panel, "llmAnalysisResult", resultWithStatus);
                            }
                        }
                        catch (e) {
                            const msg = e?.message ?? String(e);
                            console.error(`[❌] LLM 분석 실패: ${msg}`);
                            // [MOD] 에러 정보를 UI로 전송
                            const errorResult = {
                                runId,
                                status: "error",
                                summary: "분석이 실패했습니다",
                                rootCause: "",
                                suggestion: "",
                                error: msg,
                            };
                            if (panels["dashboard"]) {
                                panels["dashboard"].webview.postMessage({
                                    command: "llmAnalysisResult",
                                    payload: errorResult,
                                });
                            }
                            else {
                                send(panel, "llmAnalysisResult", errorResult);
                            }
                            vscode.window.showErrorMessage(`❌ Analysis failed: ${msg}`);
                        }
                    });
                }
                catch (error) {
                    console.error("LLM analysis start error:", error);
                    send(panel, "error", "Failed to start LLM analysis.");
                }
                break;
            case "analyzeSecondPass":
                try {
                    const payload = message.payload || {};
                    const targetPath = String(payload.path || "");
                    if (!targetPath) {
                        send(panel, "error", "Second analysis: path is empty.");
                        break;
                    }
                    const lineHint = Number.isFinite(Number(payload.lineHint)) ? Number(payload.lineHint) : undefined;
                    const logExcerpt = String(payload.logExcerpt || "");
                    const contextMeta = (payload.context && typeof payload.context === "object") ? payload.context : undefined;
                    const radius = Number.isFinite(Number(payload.radius)) ? Number(payload.radius) : 30;
                    const ref = payload.ref ? String(payload.ref) : "main";
                    // 코드 본문 읽기
                    const fullText = await getRepoFileText(octokit, repo, targetPath, ref);
                    if (!fullText) {
                        send(panel, "error", `Unable to read file: ${targetPath} @ ${ref}`);
                        break;
                    }
                    const codeWindow = buildCodeWindow(fullText, lineHint, radius);
                    const input = {
                        path: targetPath,
                        logExcerpt,
                        codeWindow,
                        lineHint,
                        context: contextMeta,
                    };
                    // LLM 2차 분석
                    const result = await (0, secondPass_1.analyzeSecondPass)(context, input);
                    // 출력/전달
                    (0, printToOutput_1.printToOutput)("LLM 2nd Pass Analysis Result", [JSON.stringify(result, null, 2)]);
                    if (panels["dashboard"]) {
                        panels["dashboard"].webview.postMessage({
                            command: "secondPassResult",
                            payload: { ...result, file: targetPath },
                        });
                    }
                    else {
                        send(panel, "secondPassResult", { ...result, file: targetPath });
                    }
                }
                catch (error) {
                    console.error("2nd Pass analysis error:", error);
                    send(panel, "error", `2nd Pass analysis failed: ${error?.message || error}`);
                }
                break;
            case "analyzeLog":
                send(panel, "error", "Log analysis is not yet implemented.");
                break;
        }
    }, undefined, context.subscriptions);
    // Handle when the panel is closed
    panel.onDidDispose(() => {
        delete panels[page];
    }, null, context.subscriptions);
    // Store the panel and send the initial page message
    panels[page] = panel;
    panel.webview.postMessage({ command: "changePage", page });
}
function getWebviewContent(context, panel) {
    const buildPath = path.join(context.extensionPath, "out", "webview-build");
    const scriptPath = path.join(buildPath, "assets", "index.js");
    const stylePath = path.join(buildPath, "assets", "index.css");
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
    const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(stylePath));
    const nonce = getNonce();
    console.log('[extension.ts] 웹뷰 HTML 생성 중...');
    console.log('[extension.ts] 빌드 경로:', buildPath);
    console.log('[extension.ts] 스크립트 URI:', scriptUri.toString());
    console.log('[extension.ts] 스타일 URI:', styleUri.toString());
    // The title here is for the HTML document itself, not the panel tab.
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${panel.webview.cspSource} data:; img-src ${panel.webview.cspSource} https: data:;">
      <title>MAD Ops</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}">
        // VSCode API 주입 (완전 격리)
        console.log('[Webview] 스크립트 로드 시작');
        
        // acquireVsCodeApi 함수를 임시로 저장
        const originalAcquireVsCodeApi = window.acquireVsCodeApi;
        
        try {
          // 한 번만 초기화
          if (!window.vscode) {
            window.vscode = originalAcquireVsCodeApi();
            console.log('[Webview] VSCode API 초기화됨');
            console.log('[Webview] vscode 객체:', window.vscode);
          } else {
            console.log('[Webview] VSCode API 이미 존재함');
          }
          
          // acquireVsCodeApi 함수를 제거하여 중복 호출 방지
          delete window.acquireVsCodeApi;
          
          // React 앱에서 사용할 수 있도록 전역 함수 제공
          window.getVscode = function() {
            return window.vscode;
          };
          
        } catch (error) {
          console.log('[Webview] VSCode API 초기화 실패:', error.message);
          // 실패해도 acquireVsCodeApi 함수는 제거
          delete window.acquireVsCodeApi;
        }
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
    console.log('[extension.ts] 웹뷰 HTML 생성 완료');
    return html;
}
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function send(panel, command, payload) {
    panel.webview.postMessage({ command, payload });
}
function isNumericId(s) {
    return /^\d+$/.test(s);
}
function ensureWorkflowPathFromWorkflow(wf) {
    if (!wf?.path)
        throw new Error("Unable to find the workflow path.");
    return wf.path;
}
// 레포에서 텍스트 파일 가져오기 (main 기준)
async function getRepoFileText(octokit, repo, filePath, ref = "main") {
    const r = await octokit.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path: filePath,
        ref,
    });
    if (Array.isArray(r.data))
        return "";
    const base64 = r.data.content?.replace(/\n/g, "") ?? "";
    return Buffer.from(base64, "base64").toString("utf8");
}
// 라인 힌트 중심 ±radius 줄 코드 윈도우 만들기
function buildCodeWindow(fullText, lineHint, radius = 30) {
    const lines = fullText.split(/\r?\n/);
    if (!lineHint || lineHint < 1 || lineHint > lines.length) {
        // 라인 힌트 없으면 앞쪽 일부만
        return lines.slice(0, Math.min(200, lines.length)).join("\n");
    }
    const idx = lineHint - 1;
    const start = Math.max(0, idx - radius);
    const end = Math.min(lines.length, idx + radius + 1);
    return lines.slice(start, end).join("\n");
}
