import { Router } from "express";
import { AnalyzeRunSchema, AnalyzeRunBody } from "../schemas";
import { pushEvent } from "../sse";
import { v4 as uuid } from "uuid";
import { makeOctokit } from "../../github/client";
import { getFailedStepsAndPrompts } from "../../log/getFailedLogs";
import { analyzePrompts } from "../../llm/analyze";
import * as fs from "fs";

const router = Router();

/** POST /api/analyze-run  */
router.post("/", async (req, res) => {
  // 로그 분석용 
  console.log("[analyzeRun] 요청 들어옴:", req.body);

  const parsed = AnalyzeRunSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const body: AnalyzeRunBody = parsed.data;
  const correlationId = body.correlationId ?? uuid();
  const { owner, name } = body.repo;

  try {
    const octokit = makeOctokit();

    // 1) 상태 알림: 로그 다운로드 시작
    pushEvent(correlationId, "log_ready", { message: "Downloading logs...", runId: body.runId });


    // 2) 실패 스텝/프롬프트 추출

    // 로그 찍는거
    console.log("[SRV] 🛠️ getFailedStepsAndPrompts 시작");

    const { failedSteps, prompts } = await getFailedStepsAndPrompts(
      octokit,
      owner,
      name,
      body.runId,
      body.logMode
    );

    // 로그 찍는거
    console.log("[SRV] 🛠️ prompts 추출 완료", prompts.length);
    
    // 실패 스텝 없음 → 완료 처리
    if (!failedSteps?.length || !prompts?.length) {
      pushEvent(correlationId, "completed", {
        message: "No failed steps to analyze.",
        runId: body.runId,
      });
      return res.json({
        correlationId,
        runId: body.runId,
        failedStepsCount: 0,
        analysis: null,
      });
    }

    const raw = await analyzePrompts(prompts);
    const llm = normalizeLlmResult(raw, failedSteps);

    pushEvent(correlationId, "llm_result", llm);
    pushEvent(correlationId, "completed", { message: "Analysis done ✅", runId: body.runId });

    return res.json({ correlationId, runId: body.runId, analysis: llm });
  } catch (e: any) {
    pushEvent(correlationId, "error", { message: e?.message ?? "Unknown error" });
    return res.status(500).json({ correlationId, error: e?.message ?? "Unknown error" });
  }
});

export default router;

/** 확장에서 바로 알림/표시 가능하게 결과 스키마 정규화 */
function normalizeLlmResult(raw: any, failedSteps: string[]) {
  const summary =
    raw?.summary ??
    raw?.message ??
    "분석 결과가 준비되었습니다. 자세한 내용은 출력창을 확인하세요.";
  const rootCause = raw?.rootCause ?? raw?.cause ?? undefined;
  const suggestion = raw?.suggestion ?? raw?.fix ?? undefined;

  let items = Array.isArray(raw?.items) ? raw.items : [];
  if (items.length === 0 && Array.isArray(raw)) {
    items = raw;
  }

  items = items.map((it: any, idx: number) => ({
    step: it?.step ?? failedSteps[idx] ?? `Step ${idx + 1}`,
    filename: it?.filename,
    reason: it?.reason ?? it?.summary ?? it?.message,
    fix: it?.fix ?? it?.suggestion,
  }));

  return { summary, rootCause, suggestion, items };
}
