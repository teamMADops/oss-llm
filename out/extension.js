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
const getRepoInfo_1 = require("./github/getRepoInfo");
const github_1 = require("./github");
const getRunList_1 = require("./github/getRunList");
const printToOutput_1 = require("./output/printToOutput");
const getFailedLogs_1 = require("./log/getFailedLogs");
const analyze_1 = require("./llm/analyze");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * It is automatically called when the extension is activated.
 * It register functions as commands.
 * @param context - vscode.ExtensionContext
 */
function activate(context) {
    const functionRegister = (functionHandler) => {
        const cmd = vscode.commands.registerCommand(`extension.${functionHandler.name}`, functionHandler);
        context.subscriptions.push(cmd);
    };
    const setOpenAiKey = async () => {
        const key = await vscode.window.showInputBox({
            prompt: "OpenAI API Key를 입력하세요",
            ignoreFocusOut: true,
            password: true,
        });
        if (key) {
            await context.secrets.store("openaiApiKey", key);
            vscode.window.showInformationMessage("✅ OpenAI API Key가 저장되었습니다.");
        }
    };
    functionRegister(setOpenAiKey);
    const clearOpenAiKey = async () => {
        await context.secrets.delete("openaiApiKey");
        vscode.window.showInformationMessage("🗑️ OpenAI API Key가 삭제되었습니다.");
    };
    functionRegister(clearOpenAiKey);
    const setRepository = async () => (0, getRepoInfo_1.promptAndSaveRepo)(context);
    functionRegister(setRepository);
    const clearRepository = async () => (0, getRepoInfo_1.deleteSavedRepo)(context);
    functionRegister(clearRepository);
    const showRepository = async () => {
        const cur = (0, getRepoInfo_1.getSavedRepo)(context);
        vscode.window.showInformationMessage(`현재 레포: ${cur ? cur.owner + "/" + cur.repo : "(none)"}`);
    };
    functionRegister(showRepository);
    const loginGithub = async () => {
        const before = await (0, github_1.getExistingGitHubSession)();
        const ok = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (ok) {
            const after = await (0, github_1.getExistingGitHubSession)();
            const who = after?.account?.label ?? "GitHub";
            vscode.window.showInformationMessage(before ? `이미 로그인되어 있습니다: ${who}` : `로그인 완료: ${who}`);
        }
        else {
            vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
        }
    };
    functionRegister(loginGithub);
    const logoutGithub = async () => {
        const session = await (0, github_1.getExistingGitHubSession)();
        if (!session) {
            vscode.window.showInformationMessage("이미 로그아웃 상태입니다.");
            return;
        }
        const isSignOut = await (0, github_1.isSignOutGitHub)();
        if (isSignOut) {
            vscode.window.showInformationMessage("GitHub 로그아웃 완료.");
        }
    };
    functionRegister(logoutGithub);
    const analyzeGitHubActions = async (repoArg) => {
        console.log("[1] 🔍 확장 실행됨");
        // 우선순위: 명령 인자 > 저장된 레포
        const repo = repoArg ?? (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            vscode.window.showWarningMessage("저장된 레포가 없습니다. 먼저 레포를 등록하세요.");
            return;
        }
        console.log(`[2] ✅ 레포: ${repo.owner}/${repo.repo}`);
        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
            return;
        }
        console.log("[3] 🔑 VS Code GitHub 세션 확보");
        const run_id = await (0, getRunList_1.getRunIdFromQuickPick)(octokit, repo.owner, repo.repo);
        if (!run_id) {
            vscode.window.showInformationMessage("선택된 워크플로우 실행이 없습니다.");
            return;
        }
        console.log(`[4] ✅ 선택된 Run ID: ${run_id}`);
        const mode = await vscode.window.showQuickPick(["전체 로그", "에러 메세지만"], {
            placeHolder: "LLM 프롬프트에 포함할 로그 범위 선택",
        });
        const logMode = mode === "전체 로그" ? "all" : "error";
        console.log(`[5] 📄 로그 추출 방식: ${logMode}`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Run #${run_id} 분석 중...`,
        }, async (progress) => {
            try {
                progress.report({
                    message: "로그 ZIP 다운로드 및 프롬프트 생성 중",
                });
                const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, run_id, logMode);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} 실패한 Step 목록`, failedSteps);
                (0, printToOutput_1.printToOutput)(`Run #${run_id} → LLM 프롬프트`, prompts);
                if (prompts.length === 0) {
                    vscode.window.showInformationMessage("분석할 로그가 없습니다.");
                    return;
                }
                progress.report({ message: "LLM 호출 중" });
                const analysis = await (0, analyze_1.analyzePrompts)(context, prompts); // { summary, rootCause, suggestion }
                (0, printToOutput_1.printToOutput)("LLM 분석 결과", [JSON.stringify(analysis, null, 2)]);
                if (panels["dashboard"]) {
                    panels["dashboard"].webview.postMessage({
                        command: "llmAnalysisResult",
                        payload: analysis,
                    });
                    vscode.window.showInformationMessage("LLM 분석 결과가 대시보드에 표시되었습니다.");
                }
                else {
                    const summary = analysis.summary ?? "LLM 분석이 완료되었습니다.";
                    const choice = await vscode.window.showInformationMessage(`🧠 ${summary}`, "출력창 열기", "요약 복사");
                    if (choice === "출력창 열기") {
                        vscode.commands.executeCommand("workbench.action.output.toggleOutput");
                    }
                    else if (choice === "요약 복사") {
                        await vscode.env.clipboard.writeText(summary);
                        vscode.window.showInformationMessage("📋 요약을 클립보드에 복사했어요.");
                    }
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`❌ 분석 실패: ${e?.message ?? e}`);
            }
        });
    };
    functionRegister(analyzeGitHubActions);
    const openDashboard = async () => {
        createAndShowWebview(context, "dashboard");
    };
    functionRegister(openDashboard);
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
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
    const pageTitle = `MAD Ops: ${page.charAt(0).toUpperCase() + page.slice(1)}`;
    // If we already have a panel for this page, show it.
    if (panels[page]) {
        panels[page].reveal(column);
        // Also send a message to ensure the correct page is displayed, in case the user changed it.
        panels[page].webview.postMessage({ command: "changePage", page });
        return;
    }
    const panel = vscode.window.createWebviewPanel(page, pageTitle, column || vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "out", "webview-build")),
        ],
    });
    panel.webview.html = getWebviewContent(context, panel);
    panel.webview.onDidReceiveMessage(async (message) => {
        const octokit = await (0, github_1.getOctokitViaVSCodeAuth)();
        if (!octokit) {
            vscode.window.showErrorMessage("GitHub 로그인에 실패했습니다.");
            return;
        }
        console.log("[3] 🔑 VS Code GitHub 세션 확보");
        const repo = await (0, getRepoInfo_1.getSavedRepo)(context);
        if (!repo) {
            panel.webview.postMessage({
                command: "error",
                payload: "GitHub 리포지토리 정보를 찾을 수 없습니다.",
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
                    send(panel, "error", "Run 로그를 가져오는데 실패했습니다.");
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
                    // TODO : 여기서 triggerLlmAnalysis 사용, 이를 적절하게 대체 필요!
                    // await triggerLlmAnalysis(context, repo, runId);
                    // ✅ 커맨드 경로의 LLM 분석 블록을 그대로 사용 (변수명만 맞춤)
                    const logMode = message.payload?.logMode === "all" ? "all" : "error";
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Run #${runId} 분석 중...`,
                    }, async (progress) => {
                        try {
                            progress.report({
                                message: "로그 ZIP 다운로드 및 프롬프트 생성 중",
                            });
                            const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, runId, logMode);
                            (0, printToOutput_1.printToOutput)(`Run #${runId} 실패한 Step 목록`, failedSteps);
                            (0, printToOutput_1.printToOutput)(`Run #${runId} → LLM 프롬프트`, prompts);
                            if (prompts.length === 0) {
                                send(panel, "llmAnalysisResult", {
                                    runId,
                                    summary: "분석할 로그가 없습니다.",
                                    rootCause: null,
                                    suggestion: null,
                                    items: [],
                                });
                                vscode.window.showInformationMessage("분석할 로그가 없습니다.");
                                return;
                            }
                            progress.report({ message: "LLM 호출 중" });
                            // const analysis = await analyzePrompts(prompts);
                            const analysis = await (0, analyze_1.analyzePrompts)(context, prompts);
                            (0, printToOutput_1.printToOutput)("LLM 분석 결과", [
                                JSON.stringify(analysis, null, 2),
                            ]);
                            // 여기서는 현재 열려있는 대시보드로 보내거나, 바로 이 패널로 회신 둘 중 택1
                            if (panels["dashboard"]) {
                                panels["dashboard"].webview.postMessage({
                                    command: "llmAnalysisResult",
                                    payload: { runId, ...analysis },
                                });
                            }
                            else {
                                send(panel, "llmAnalysisResult", { runId, ...analysis });
                            }
                        }
                        catch (e) {
                            const msg = e?.message ?? String(e);
                            send(panel, "error", `LLM 분석 실패: ${msg}`);
                            vscode.window.showErrorMessage(`❌ 분석 실패: ${msg}`);
                        }
                    });
                }
                catch (error) {
                    console.error("LLM 분석 시작 중 오류 발생:", error);
                    send(panel, "error", "LLM 분석을 시작하는 데 실패했습니다.");
                }
                break;
            case "analyzeLog":
                send(panel, "error", "로그 분석은 아직 구현되지 않았습니다.");
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
        throw new Error("워크플로우 경로를 찾을 수 없습니다.");
    return wf.path;
}
