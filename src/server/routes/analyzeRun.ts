import { Router } from "express";
import { AnalyzeRunSchema, AnalyzeRunBody } from "../schemas";
import { pushEvent } from "../sse";
import { v4 as uuid } from "uuid";
import { makeOctokit } from "../../github/client";
import { getFailedStepsAndPrompts } from "../../github/logs";
import { analyzePrompts } from "../../llm/analyze";

const router = Router();

/** POST /api/analyze-run  */
router.post("/", async (req, res) => {
  const parsed = AnalyzeRunSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const body: AnalyzeRunBody = parsed.data;
  const correlationId = body.correlationId ?? uuid();
  const { owner, name } = body.repo;

  try {
    const octokit = makeOctokit();
    pushEvent(correlationId, "log_ready", { message: "Downloading logs...", runId: body.runId });

    const { prompts } = await getFailedStepsAndPrompts(octokit, owner, name, body.runId, body.logMode);
    const llm = await analyzePrompts(prompts);

    pushEvent(correlationId, "llm_result", llm);
    pushEvent(correlationId, "completed", { message: "Analysis done ✅", runId: body.runId });

    return res.json({ correlationId, runId: body.runId, analysis: llm });
  } catch (e: any) {
    pushEvent(correlationId, "error", { message: e?.message ?? "Unknown error" });
    return res.status(500).json({ correlationId, error: e?.message ?? "Unknown error" });
  }
});

export default router;
