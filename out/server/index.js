"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
const sse_1 = require("./sse");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: false }));
app.use(express_1.default.json({ limit: "2mb" }));
// SSE 이벤트 채널 (프론트는 /api/events/:correlationId 에 연결)
app.get("/api/events/:correlationId", sse_1.sseEndpoint);
// REST 라우트
app.use("/api", routes_1.default);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4310;
app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
