import * as vscode from 'vscode';
import { getFailedStepsAndPrompts } from '../log/getFailedLogs';
import { extractRelevantLog } from '../log/extractRelevantLog';
import { analyzePrompts } from './analyze';
import { printToOutput } from '../output/printToOutput';
import type { LLMResult } from './types/types';
import type { RepoInfo } from '../github';
import type { Octokit } from '@octokit/rest';
import { llmCache } from "./cache/llmCache";

export async function triggerLlmAnalysis(
    context: vscode.ExtensionContext,
    octokit: Octokit,
    repo: RepoInfo,
    runId: number,
    logMode: 'all' | 'error'
): Promise<LLMResult | null> {
    // 1. Get failed steps and their corresponding log prompts.
    try {
    


        const { failedSteps, prompts } = await getFailedStepsAndPrompts(
            octokit,
            repo.owner,
            repo.repo,
            runId,
            logMode
        );

        printToOutput(`Run #${runId} 실패한 Step 목록`, failedSteps);

    // 2. If there are no prompts, there's nothing to analyze.
        if (prompts.length === 0) {
        printToOutput(`Run #${runId}`, ["분석할 로그가 없습니다."]);
        return null; 
        }

    // 3. **PERFORMANCE OPTIMIZATION**
    // Extract only the relevant parts of the logs (around errors) to create smaller prompts.
    const relevantPrompts = prompts.map(p => extractRelevantLog(p, 'error'));
    printToOutput(`Run #${runId} → 축약된 LLM 프롬프트`, relevantPrompts);

    // 4. Call the LLM with the optimized prompts.
    const analysis = await analyzePrompts(context, relevantPrompts);

    // 5. Return the final analysis.
    return analysis;
    } catch (err:any) {
        console.error(`[triggerLlmAnalysis] 실패:`, err);
        vscode.window.showErrorMessage(`❌ LLM 분석 중 오류 발생: ${err?.message ?? err}`);
    return null;
    }
}
