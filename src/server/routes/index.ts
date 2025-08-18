import { Router } from "express";
import runworkflow from "./runworkflow";
import analyzeRun from "./analyzeRun";

const router = Router();
router.use("/run-workflow", runworkflow); // POST /api/run-workflow
router.use("/analyze-run", analyzeRun);   // POST /api/analyze-run
export default router;
