// src/llm/cache/cacheUtils.ts
import * as crypto from "crypto";

export function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function nowIso() {
  return new Date().toISOString();
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function limitString(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n);
}

export function isExpired(createdAtIso: string, ttlMs: number) {
  const born = new Date(createdAtIso).getTime();
  return Date.now() > born + ttlMs;
}
