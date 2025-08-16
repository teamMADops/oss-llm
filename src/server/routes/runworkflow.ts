import { Router } from "express";
import { RunWorkflowSchema, RunWorkflowBody } from "../schemas";
import { pushEvent } from "../sse";
import { v4 as uuid } from "uuid";
import { makeOctokit } from "../../github/client";
import { dispatchWorkflow, pollUntilDone } from "../../github/runs";
import { getFailedStepsAndPrompts } from "../../log/getFailedLogs";
import { analyzePrompts } from "../../llm/analyze";

const router = Router();

/**
 * POST /api/run-workflow
 * body: { repo:{owner,name}, workflow:{filename,ref,inputs}, correlationId? }
 * res : { correlationId, runId, runUrl, started:true }
 * SSE : queued → in_progress(여러번) → [log_ready → llm_result] → completed|error
 */

router.post("/", async (req, res) => {
  const parsed = RunWorkflowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const body: RunWorkflowBody = parsed.data;
  const correlationId = body.correlationId ?? uuid();
  const { owner, name } = body.repo;
  const { filename, ref, inputs } = body.workflow;

  try {
    pushEvent(correlationId, "queued", { message: "Dispatching workflow..." });

    const octokit = makeOctokit();
    const { runId, runUrl } = await dispatchWorkflow(octokit, owner, name, filename, ref, inputs);

    pushEvent(correlationId, "in_progress", { message: "Workflow running...", runId, runUrl });

    const conclusion = await pollUntilDone(octokit, owner, name, runId, (m) =>
      pushEvent(correlationId, "in_progress", { message: m, runId, runUrl })
    );

    if (conclusion === "success") {
      pushEvent(correlationId, "completed", { message: "Run succeeded 🎉", runId, runUrl });
      return res.json({ correlationId, runId, runUrl, started: true, conclusion });
    }

    // 실패 → 로그 분석
    pushEvent(correlationId, "log_ready", { message: "Downloading & analyzing failure logs...", runId });
    const { prompts } = await getFailedStepsAndPrompts(octokit, owner, name, runId, "error");
    const llm = await analyzePrompts(prompts);
    pushEvent(correlationId, "llm_result", llm);
    pushEvent(correlationId, "completed", { message: "Analysis done ✅", runId });

    return res.json({ correlationId, runId, runUrl, started: true, conclusion, analysis: llm });
  } catch (e: any) {
    pushEvent(correlationId, "error", { message: e?.message ?? "Unknown error" });
    return res.status(500).json({ correlationId, error: e?.message ?? "Unknown error" });
  }
});

export default router;
