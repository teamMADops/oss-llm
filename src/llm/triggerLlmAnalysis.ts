import * as vscode from 'vscode';
import { getFailedStepsAndPrompts } from '../log/getFailedLogs';
import { extractRelevantLog } from '../log/extractRelevantLog';
import { analyzePrompts } from './analyze';
import { printToOutput } from '../output/printToOutput';
import type { LLMResult } from './types';
import type { RepoInfo } from '../github';
import type { Octokit } from '@octokit/rest';

/**
 * Triggers the entire LLM analysis process for a given workflow run.
 * It fetches logs, preprocesses them to extract relevant parts, and then calls the LLM.
 *
 * @param context - The VS Code extension context.
 * @param octokit - The Octokit instance for GitHub API calls.
 * @param repo - The repository information.
 * @param runId - The ID of the workflow run to analyze.
 * @param logMode - The mode for log fetching ('all' or 'error').
 * @returns A promise that resolves to the LLM analysis result.
 * @throws An error if no logs are found to analyze.
 */
export async function triggerLlmAnalysis(
    context: vscode.ExtensionContext,
    octokit: Octokit,
    repo: RepoInfo,
    runId: number,
    logMode: 'all' | 'error'
): Promise<LLMResult> {
    // 1. Get failed steps and their corresponding log prompts.
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
        // The caller should catch this and inform the user.
        throw new Error("분석할 로그가 없습니다.");
    }

    // 3. **PERFORMANCE OPTIMIZATION**
    // Extract only the relevant parts of the logs (around errors) to create smaller prompts.
    const relevantPrompts = prompts.map(p => extractRelevantLog(p, 'error'));
    printToOutput(`Run #${runId} → 축약된 LLM 프롬프트`, relevantPrompts);

    // 4. Call the LLM with the optimized prompts.
    const analysis = await analyzePrompts(context, relevantPrompts);

    // 5. Return the final analysis.
    return analysis;
}
