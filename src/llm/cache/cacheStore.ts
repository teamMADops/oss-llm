// src/llm/cache/cacheStore.ts
import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import type { LLMResult } from "../types";
import {
  sha256,
  nowIso,
  clamp,
  limitString,
  isExpired,
} from "./cacheUtils";

// -------------------------------
// 타입 정의
// -------------------------------
export type Namespace = "first-pass" | "second-pass";

export type PreprocessOpts = {
  maxTokens: number;
  safetyMargin: number;
  tailCount: number;
};

export type KeyParts = {
  namespace: Namespace;
  model: string;
  systemPromptVersion: string;
  preprocess?: PreprocessOpts;
  prompt: string;
  ttlMs?: number;
};

export type InitOptions = Partial<{
  enabled: boolean;
  ttlMs: number;
  diskLimitMB: number;
  memoryLimit: number;
  warmupTopK: number;
  saveRaw: boolean;
}>;

export type CacheStats = {
  entries: number;
  diskMB: number;
  memoryEntries: number;
  hits: number;
  misses: number;
  inflight: number;
};

// -------------------------------
// 내부 상태
// -------------------------------
const DEFAULTS = {
  ENABLED: true,
  TTL_MS: 7 * 24 * 60 * 60 * 1000,
  DISK_LIMIT_MB: 20,
  MEMORY_LIMIT: 200,
  WARMUP_TOP_K: 80,
  SAVE_RAW: false,
};

const CACHE_SCHEMA_VERSION = 1;
const GLOBAL_INDEX_KEY = `madops.llmCache.index.v${CACHE_SCHEMA_VERSION}`;
const GLOBAL_OPTS_KEY = `madops.llmCache.options.v${CACHE_SCHEMA_VERSION}`;

type DiskEntry = {
  schema: number;
  key: string;
  namespace: Namespace;
  model: string;
  systemPromptVersion: string;
  preprocess?: PreprocessOpts;
  createdAt: string;
  lastAccessAt: string;
  ttlMs: number;
  promptPreview?: string;
  promptHash: string;
  sizeBytes: number;
  result: LLMResult;
  raw?: string;
};

type IndexItem = {
  key: string;
  sizeBytes: number;
  lastAccessAt: string;
  createdAt: string;
};

type Index = {
  items: Record<string, IndexItem>;
  totalSizeBytes: number;
};

// -------------------------------
// 내부 변수
// -------------------------------
let ctx: vscode.ExtensionContext | null = null;
let storageDir: string | null = null;
let options = { ...DEFAULTS };

const memoryLRU: Map<string, LLMResult> = new Map();
const inflight: Map<string, Promise<LLMResult>> = new Map();
let index: Index = { items: {}, totalSizeBytes: 0 };

let hitCount = 0;
let missCount = 0;

// -------------------------------
// 내부 헬퍼
// -------------------------------
function ensureInit() {
  if (!ctx || !storageDir) {
    throw new Error("llmCache not initialized. Call llmCache.init(...) first.");
  }
}

function computeKeyHash(parts: KeyParts) {
  const pre = parts.preprocess
    ? `${parts.preprocess.maxTokens}|${parts.preprocess.safetyMargin}|${parts.preprocess.tailCount}`
    : "-";
  const keyStr = [
    `ns=${parts.namespace}`,
    `model=${parts.model}`,
    `spv=${parts.systemPromptVersion}`,
    `pre=${pre}`,
    `prompt=${parts.prompt}`,
  ].join("|");
  return sha256(keyStr);
}

function filePathByKey(hash: string) {
  return path.join(storageDir!, `${hash}.json`);
}

function touchMemoryLRU(key: string, value?: LLMResult) {
  if (memoryLRU.has(key)) {
    const v = value ?? memoryLRU.get(key)!;
    memoryLRU.delete(key);
    memoryLRU.set(key, v);
    return;
  }
  if (value) {
    memoryLRU.set(key, value);
    while (memoryLRU.size > options.MEMORY_LIMIT) {
      const it = memoryLRU.keys().next();
      if (it.done) break;
      memoryLRU.delete(it.value);
    }
  }
}

async function atomicWriteJSON(filePath: string, obj: any): Promise<number> {
  const tmp = `${filePath}.tmp`;
  const json = JSON.stringify(obj);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, filePath);
  return Buffer.byteLength(json, "utf8");
}

async function readDiskEntry(hash: string): Promise<DiskEntry | null> {
  try {
    const json = await fs.readFile(filePathByKey(hash), "utf8");
    const obj = JSON.parse(json) as DiskEntry;
    if (obj?.schema !== CACHE_SCHEMA_VERSION) return null;
    return obj;
  } catch {
    return null;
  }
}

async function writeDiskEntry(entry: Omit<DiskEntry, "sizeBytes">): Promise<DiskEntry> {
  const fp = filePathByKey(entry.key);
  const size = await atomicWriteJSON(fp, { ...entry, sizeBytes: 0 });
  const final: DiskEntry = { ...entry, sizeBytes: size };
  await atomicWriteJSON(fp, final);
  return final;
}

async function readIndex() {
  const saved = ctx!.globalState.get<Index>(GLOBAL_INDEX_KEY);
  index = saved && saved.items ? saved : { items: {}, totalSizeBytes: 0 };
}

async function writeIndex() {
  await ctx!.globalState.update(GLOBAL_INDEX_KEY, index);
}

function updateIndexOnWrite(d: DiskEntry) {
  const item: IndexItem = {
    key: d.key,
    sizeBytes: d.sizeBytes,
    lastAccessAt: d.lastAccessAt,
    createdAt: d.createdAt,
  };
  const prev = index.items[d.key];
  if (!prev) {
    index.items[d.key] = item;
    index.totalSizeBytes += d.sizeBytes;
  } else {
    index.totalSizeBytes += d.sizeBytes - prev.sizeBytes;
    index.items[d.key] = item;
  }
}

async function gcIfNeeded() {
  const limitBytes = options.DISK_LIMIT_MB * 1024 * 1024;
  if (index.totalSizeBytes <= limitBytes) return;
  const arr = Object.values(index.items).sort(
    (a, b) =>
      new Date(a.lastAccessAt).getTime() - new Date(b.lastAccessAt).getTime()
  );
  for (const item of arr) {
    if (index.totalSizeBytes <= limitBytes) break;
    try {
      await fs.rm(filePathByKey(item.key), { force: true });
    } catch {}
    index.totalSizeBytes -= item.sizeBytes;
    delete index.items[item.key];
  }
  await writeIndex();
}

// -------------------------------
// 공개 API
// -------------------------------
export const cacheStore = {
  async init(context: vscode.ExtensionContext, opts?: InitOptions) {
    ctx = context;
    options = { ...options, ...(opts ?? {}) };

    const base = ctx.globalStorageUri.fsPath;
    storageDir = path.join(base, "llm-cache");
    await fs.mkdir(storageDir, { recursive: true });
    await readIndex();
    await gcIfNeeded();
    await this.warmup(options.WARMUP_TOP_K);
  },

  async warmup(topK = options.WARMUP_TOP_K) {
    ensureInit();
    const arr = Object.values(index.items).sort(
      (a, b) =>
        new Date(b.lastAccessAt).getTime() - new Date(a.lastAccessAt).getTime()
    );
    const pick = arr.slice(0, clamp(topK, 0, options.MEMORY_LIMIT));
    for (const it of pick) {
      const d = await readDiskEntry(it.key);
      if (!d || isExpired(d.createdAt, d.ttlMs ?? options.TTL_MS)) continue;
      touchMemoryLRU(it.key, d.result);
    }
  },

  computeKeyHash,

  async get(parts: KeyParts): Promise<LLMResult | null> {
    ensureInit();
    if (!options.ENABLED) return null;

    const key = computeKeyHash(parts);
    console.log(`[CACHE] 🔎 캐시 조회: ${key}`);

    // L1
    const mem = memoryLRU.get(key);
    if (mem) {
      console.log(`[CACHE] ✅ L1 메모리 캐시 히트`);
      hitCount++;
      touchMemoryLRU(key);
      const it = index.items[key];
      if (it) {
        it.lastAccessAt = nowIso();
        await writeIndex();
      }
      return mem;
    }

    // L3
    const d = await readDiskEntry(key);
    if (!d) {
      console.log(`[CACHE] ❌ L3 디스크 캐시 미스`);
      missCount++;
      return null;
    }

    const ttl = parts.ttlMs ?? d.ttlMs ?? options.TTL_MS;
    if (isExpired(d.createdAt, ttl)) {
      console.log(`[CACHE] ⌛️ 캐시 만료: ${key}`);
      await fs.rm(filePathByKey(key), { force: true });
      delete index.items[key];
      await writeIndex();
      missCount++;
      return null;
    }

    console.log(`[CACHE] ✅ L3 디스크 캐시 히트`);
    hitCount++;
    touchMemoryLRU(key, d.result);
    d.lastAccessAt = nowIso();
    await writeDiskEntry(d);
    updateIndexOnWrite(d);
    await writeIndex();

    return d.result;
  },

  async set(parts: KeyParts, value: LLMResult, raw?: string) {
    ensureInit();
    if (!options.ENABLED) return;

    const key = computeKeyHash(parts);
    console.log(`[CACHE] 💾 새 결과 캐시 저장: ${key}`);
    const createdAt = nowIso();

    const entry: Omit<DiskEntry, "sizeBytes"> = {
      schema: CACHE_SCHEMA_VERSION,
      key,
      namespace: parts.namespace,
      model: parts.model,
      systemPromptVersion: parts.systemPromptVersion,
      preprocess: parts.preprocess,
      createdAt,
      lastAccessAt: createdAt,
      ttlMs: parts.ttlMs ?? options.TTL_MS,
      promptPreview: limitString(parts.prompt.replace(/\s+/g, " "), 200),
      promptHash: sha256(parts.prompt),
      result: value,
      raw: options.SAVE_RAW ? raw : undefined,
    };

    touchMemoryLRU(key, value);
    const written = await writeDiskEntry(entry);
    updateIndexOnWrite(written);
    await writeIndex();
    await gcIfNeeded();
  },

  async getOrCompute(
    parts: KeyParts,
    producer: () => Promise<{ result: LLMResult; raw?: string }>
  ): Promise<LLMResult> {
    ensureInit();
    if (!options.ENABLED) {
      const { result } = await producer();
      return result;
    }

    const key = computeKeyHash(parts);
    if (inflight.has(key)) return inflight.get(key)!;

    const p = (async () => {
      const cached = await this.get(parts);
      if (cached) return cached;

      const { result, raw } = await producer();
      if (result?.summary || result?.rootCause || result?.suggestion) {
        await this.set(parts, result, raw);
      }
      return result;
    })();

    inflight.set(key, p);
    try {
      return await p;
    } finally {
      inflight.delete(key);
    }
  },

  async delByKeyHash(hash: string) {
    ensureInit();
    memoryLRU.delete(hash);
    try {
      await fs.rm(filePathByKey(hash), { force: true });
    } catch {}
    if (index.items[hash]) {
      index.totalSizeBytes -= index.items[hash].sizeBytes || 0;
      delete index.items[hash];
      await writeIndex();
    }
  },

  async clearAll() {
    ensureInit();
    memoryLRU.clear();
    inflight.clear();
    try {
      await fs.rm(storageDir!, { recursive: true, force: true });
    } catch {}
    await fs.mkdir(storageDir!, { recursive: true });
    index = { items: {}, totalSizeBytes: 0 };
    await writeIndex();
    hitCount = 0;
    missCount = 0;
  },

  async stats(): Promise<CacheStats> {
    ensureInit();
    return {
      entries: Object.keys(index.items).length,
      diskMB: Math.round((index.totalSizeBytes / (1024 * 1024)) * 100) / 100,
      memoryEntries: memoryLRU.size,
      hits: hitCount,
      misses: missCount,
      inflight: inflight.size,
    };
  },
};
