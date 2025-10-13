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
exports.triggerLlmAnalysis = triggerLlmAnalysis;
const vscode = __importStar(require("vscode"));
const getFailedLogs_1 = require("../log/getFailedLogs");
const extractRelevantLog_1 = require("../log/extractRelevantLog");
const analyze_1 = require("./analyze");
const printToOutput_1 = require("../output/printToOutput");
async function triggerLlmAnalysis(context, octokit, repo, runId, logMode) {
    // 1. Get failed steps and their corresponding log prompts.
    try {
        const { failedSteps, prompts } = await (0, getFailedLogs_1.getFailedStepsAndPrompts)(octokit, repo.owner, repo.repo, runId, logMode);
        (0, printToOutput_1.printToOutput)(`Run #${runId} 실패한 Step 목록`, failedSteps);
        // 2. If there are no prompts, there's nothing to analyze.
        if (prompts.length === 0) {
            (0, printToOutput_1.printToOutput)(`Run #${runId}`, ["분석할 로그가 없습니다."]);
            return null;
        }
        // 3. **PERFORMANCE OPTIMIZATION**
        // Extract only the relevant parts of the logs (around errors) to create smaller prompts.
        const relevantPrompts = prompts.map(p => (0, extractRelevantLog_1.extractRelevantLog)(p, 'error'));
        (0, printToOutput_1.printToOutput)(`Run #${runId} → 축약된 LLM 프롬프트`, relevantPrompts);
        // 4. Call the LLM with the optimized prompts.
        const analysis = await (0, analyze_1.analyzePrompts)(context, relevantPrompts);
        // 5. Return the final analysis.
        return analysis;
    }
    catch (err) {
        console.error(`[triggerLlmAnalysis] 실패:`, err);
        vscode.window.showErrorMessage(`❌ LLM 분석 중 오류 발생: ${err?.message ?? err}`);
        return null;
    }
}
