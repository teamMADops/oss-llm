"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeRunSchema = exports.RunWorkflowSchema = void 0;
const zod_1 = require("zod");
exports.RunWorkflowSchema = zod_1.z.object({
    correlationId: zod_1.z.string().uuid().optional(),
    repo: zod_1.z.object({ owner: zod_1.z.string(), name: zod_1.z.string() }),
    workflow: zod_1.z.object({
        name: zod_1.z.string(),
        filename: zod_1.z.string(), // e.g. my-workflow.yml
        ref: zod_1.z.string(), // e.g. main
        yaml: zod_1.z.string().optional(), // 필요 시 커밋 기능 확장
        inputs: zod_1.z.record(zod_1.z.any()).optional(),
    }),
});
exports.AnalyzeRunSchema = zod_1.z.object({
    correlationId: zod_1.z.string().uuid().optional(),
    repo: zod_1.z.object({ owner: zod_1.z.string(), name: zod_1.z.string() }),
    runId: zod_1.z.number(),
    logMode: zod_1.z.enum(["all", "error"]).default("error")
});
