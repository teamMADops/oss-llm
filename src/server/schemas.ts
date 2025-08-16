import { z } from "zod";

export const RunWorkflowSchema = z.object({
  correlationId: z.string().uuid().optional(),
  repo: z.object({ owner: z.string(), name: z.string() }),
  workflow: z.object({
    name: z.string(),
    filename: z.string(),   // e.g. my-workflow.yml
    ref: z.string(),        // e.g. main
    yaml: z.string().optional(), // 필요 시 커밋 기능 확장
    inputs: z.record(z.any()).optional(),
  }),
});

export const AnalyzeRunSchema = z.object({
  correlationId: z.string().uuid().optional(),
  repo: z.object({ owner: z.string(), name: z.string() }),
  runId: z.number(),
  logMode: z.enum(["all", "error"]).default("error")
});

export type RunWorkflowBody = z.infer<typeof RunWorkflowSchema>;
export type AnalyzeRunBody  = z.infer<typeof AnalyzeRunSchema>;
