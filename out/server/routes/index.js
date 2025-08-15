"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const runworkflow_1 = __importDefault(require("./runworkflow"));
const analyzeRun_1 = __importDefault(require("./analyzeRun"));
const router = (0, express_1.Router)();
router.use("/run-workflow", runworkflow_1.default); // POST /api/run-workflow
router.use("/analyze-run", analyzeRun_1.default); // POST /api/analyze-run
exports.default = router;
