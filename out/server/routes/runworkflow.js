"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../schemas");
const sse_1 = require("../sse");
const uuid_1 = require("uuid");
const client_1 = require("../../github/client");
const runs_1 = require("../../github/runs");
const logs_1 = require("../../github/logs");
const analyze_1 = require("../../llm/analyze");
const router = (0, express_1.Router)();
/**
 * POST /api/run-workflow
 * body: { repo:{owner,name}, workflow:{filename,ref,inputs}, correlationId? }
 * res : { correlationId, runId, runUrl, started:true }
 * SSE : queued → in_progress(여러번) → [log_ready → llm_result] → completed|error
 */
router.post("/", async (req, res) => {
    const parsed = schemas_1.RunWorkflowSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues });
    const body = parsed.data;
    const correlationId = body.correlationId ?? (0, uuid_1.v4)();
    const { owner, name } = body.repo;
    const { filename, ref, inputs } = body.workflow;
    try {
        (0, sse_1.pushEvent)(correlationId, "queued", { message: "Dispatching workflow..." });
        const octokit = (0, client_1.makeOctokit)();
        const { runId, runUrl } = await (0, runs_1.dispatchWorkflow)(octokit, owner, name, filename, ref, inputs);
        (0, sse_1.pushEvent)(correlationId, "in_progress", { message: "Workflow running...", runId, runUrl });
        const conclusion = await (0, runs_1.pollUntilDone)(octokit, owner, name, runId, (m) => (0, sse_1.pushEvent)(correlationId, "in_progress", { message: m, runId, runUrl }));
        if (conclusion === "success") {
            (0, sse_1.pushEvent)(correlationId, "completed", { message: "Run succeeded 🎉", runId, runUrl });
            return res.json({ correlationId, runId, runUrl, started: true, conclusion });
        }
        // 실패 → 로그 분석
        (0, sse_1.pushEvent)(correlationId, "log_ready", { message: "Downloading & analyzing failure logs...", runId });
        const { prompts } = await (0, logs_1.getFailedStepsAndPrompts)(octokit, owner, name, runId, "error");
        const llm = await (0, analyze_1.analyzePrompts)(prompts);
        (0, sse_1.pushEvent)(correlationId, "llm_result", llm);
        (0, sse_1.pushEvent)(correlationId, "completed", { message: "Analysis done ✅", runId });
        return res.json({ correlationId, runId, runUrl, started: true, conclusion, analysis: llm });
    }
    catch (e) {
        (0, sse_1.pushEvent)(correlationId, "error", { message: e?.message ?? "Unknown error" });
        return res.status(500).json({ correlationId, error: e?.message ?? "Unknown error" });
    }
});
exports.default = router;
