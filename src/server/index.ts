import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import { sseEndpoint } from "./sse";

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "2mb" }));

// SSE 이벤트 채널 (프론트는 /api/events/:correlationId 에 연결)
app.get("/api/events/:correlationId", sseEndpoint);

// REST 라우트
app.use("/api", routes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4310;
app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
