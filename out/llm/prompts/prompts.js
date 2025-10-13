"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFirstPassPrompt = buildFirstPassPrompt;
exports.buildSecondPassPrompt = buildSecondPassPrompt;
/**
 * First-pass prompt builder (log-only analysis)
 * - Takes a core excerpt of a failed GitHub Actions log and instructs the LLM
 *   to produce summary, root cause, suggestion, key errors, and optionally suspectedPaths.
 * - The system prompt is provided separately in analyze.ts; this function only builds the user message content.
 */
function buildFirstPassPrompt(logChunk) {
    const guide = [
        "The following is a partial GitHub Actions failure log.",
        "Analyze only the essential parts and output **JSON only**. No markdown, code fences, or explanatory sentences.",
        "If the log is empty or cannot be analyzed, return a JSON where the `summary` field contains a message such as 'No analyzable log content found.'",
        "",
        "Required JSON keys:",
        "- summary: A 2–3 sentence summary of the issue.",
        "- rootCause: A single clear sentence describing the core reason for failure.",
        "- suggestion: Concrete and actionable fixes (commands, file paths, or configuration keys). Must include the following:",
        "  1. Description of the affected code line or area (e.g., line 19 in buggyModule.ts).",
        "  2. Two or three possible fixes (e.g., add null checks, update type declarations, improve error handling).",
        "  3. A working code example if relevant (without markdown or code fences).",
        "  4. Any related commands or documentation links (e.g., npm install, MDN docs).",
        "  Example:",
        '  \"suggestion\": \"1) Add a null check before accessing user.email in buggyModule.ts.\\n2) Update the User interface to declare email as string | null.\\n3) Example: if (user?.email) return user.email.toUpperCase(); else console.warn(\\\"No email found\\\");\"',
        "",
        "- failureType: One of dependency | network | tooling | permissions | config | test | infra.",
        "- confidence: A number between 0 and 1.",
        "- affectedStep: The related CI step name (if available).",
        "- filename: The analyzed log file or section name (if available).",
        "- keyErrors: [{ line, snippet, note }].",
        // Optional: include suspectedPaths if desired
        // "- suspectedPaths: [{ path, reason, score, linesHint }]",
        "",
        "Output rules (DO NOT violate):",
        "- Do not include phrases like 'Example output' or 'Example code block'.",
        "- Include code examples only when necessary.",
        "- Represent code examples using escaped newlines (\\n) inside JSON strings.",
        "- No unnecessary explanations, markdown, or commentary.",
        "- All text must be written in clear, natural English sentences.",
        "- Output must be JSON only.",
    ];
    return [guide.join("\n"), logChunk].join("\n");
}
/**
 * Second-pass prompt builder (log + code analysis)
 * - Takes a suspected code region with its surrounding context and log excerpt.
 * - Instructs the LLM to produce file/line info, unified diff, and checklist items in JSON format.
 */
function buildSecondPassPrompt(input) {
    const { path, logExcerpt, codeWindow, lineHint, context } = input;
    const header = [
        "This is a detailed analysis request for a specific suspected code region.",
        "You are provided with both a failure log excerpt and the corresponding code window.",
        "The output must be strictly **JSON only**. No markdown, explanations, or code fences.",
        "",
        "Required JSON keys:",
        '- file: the file path where the issue occurs (e.g., "src/app.ts").',
        "- startLine: the starting line of the suggested patch (estimate if uncertain).",
        "- endLine: the ending line of the suggested patch (estimate if uncertain).",
        '- unifiedDiff: a string in UNIX unified diff format (---/+++/@@ sections included).',
        "- checklist: an array of human-review items for PR validation (e.g., ['Check null handling.', 'Verify variable type consistency.']).",
        "- confidence: a number between 0 and 1.",
        "",
        "Additional instructions:",
        "- Follow the minimal change principle when generating patches.",
        "- If the issue is environmental or network-related (i.e., not fixable by code changes), leave `unifiedDiff` empty and specify concrete actions in the `checklist` instead.",
        "- Never expose reasoning or chain-of-thought.",
        "- Always respond in English, even if the log contains another language.",
        "",
        `Target file path: ${path}`,
        lineHint ? `Suspected line hint: ${lineHint}` : undefined,
        context?.workflow ? `Workflow: ${context.workflow}` : undefined,
        context?.step ? `Step: ${context.step}` : undefined,
    ]
        .filter(Boolean)
        .join("\n");
    const sections = [
        header,
        "",
        "=== Log Excerpt Start ===",
        logExcerpt.trim(),
        "=== Log Excerpt End ===",
        "",
        "=== Code Window Start ===",
        codeWindow.trim(),
        "=== Code Window End ===",
    ];
    return sections.join("\n");
}
