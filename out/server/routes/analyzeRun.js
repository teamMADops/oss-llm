"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../schemas");
const sse_1 = require("../sse");
const uuid_1 = require("uuid");
const client_1 = require("../../github/client");
const logs_1 = require("../../github/logs");
const analyze_1 = require("../../llm/analyze");
const router = (0, express_1.Router)();
/** POST /api/analyze-run  */
router.post("/", async (req, res) => {
    const parsed = schemas_1.AnalyzeRunSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues });
    const body = parsed.data;
    const correlationId = body.correlationId ?? (0, uuid_1.v4)();
    const { owner, name } = body.repo;
    try {
        const octokit = (0, client_1.makeOctokit)();
        (0, sse_1.pushEvent)(correlationId, "log_ready", { message: "Downloading logs...", runId: body.runId });
        const { prompts } = await (0, logs_1.getFailedStepsAndPrompts)(octokit, owner, name, body.runId, body.logMode);
        const llm = await (0, analyze_1.analyzePrompts)(prompts);
        (0, sse_1.pushEvent)(correlationId, "llm_result", llm);
        (0, sse_1.pushEvent)(correlationId, "completed", { message: "Analysis done ✅", runId: body.runId });
        return res.json({ correlationId, runId: body.runId, analysis: llm });
    }
    catch (e) {
        (0, sse_1.pushEvent)(correlationId, "error", { message: e?.message ?? "Unknown error" });
        return res.status(500).json({ correlationId, error: e?.message ?? "Unknown error" });
    }
});
exports.default = router;
