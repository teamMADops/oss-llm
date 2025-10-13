"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const cacheUtils_1 = require("./cacheUtils");
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
// -------------------------------
// 내부 변수
// -------------------------------
let ctx = null;
let storageDir = null;
let options = { ...DEFAULTS };
const memoryLRU = new Map();
const inflight = new Map();
let index = { items: {}, totalSizeBytes: 0 };
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
function computeKeyHash(parts) {
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
    return (0, cacheUtils_1.sha256)(keyStr);
}
function filePathByKey(hash) {
    return path.join(storageDir, `${hash}.json`);
}
function touchMemoryLRU(key, value) {
    if (memoryLRU.has(key)) {
        const v = value ?? memoryLRU.get(key);
        memoryLRU.delete(key);
        memoryLRU.set(key, v);
        return;
    }
    if (value) {
        memoryLRU.set(key, value);
        while (memoryLRU.size > options.MEMORY_LIMIT) {
            const it = memoryLRU.keys().next();
            if (it.done)
                break;
            memoryLRU.delete(it.value);
        }
    }
}
async function atomicWriteJSON(filePath, obj) {
    const tmp = `${filePath}.tmp`;
    const json = JSON.stringify(obj);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmp, json, "utf8");
    await fs.rename(tmp, filePath);
    return Buffer.byteLength(json, "utf8");
}
async function readDiskEntry(hash) {
    try {
        const json = await fs.readFile(filePathByKey(hash), "utf8");
        const obj = JSON.parse(json);
        if (obj?.schema !== CACHE_SCHEMA_VERSION)
            return null;
        return obj;
    }
    catch {
        return null;
    }
}
async function writeDiskEntry(entry) {
    const fp = filePathByKey(entry.key);
    const size = await atomicWriteJSON(fp, { ...entry, sizeBytes: 0 });
    const final = { ...entry, sizeBytes: size };
    await atomicWriteJSON(fp, final);
    return final;
}
async function readIndex() {
    const saved = ctx.globalState.get(GLOBAL_INDEX_KEY);
    index = saved && saved.items ? saved : { items: {}, totalSizeBytes: 0 };
}
async function writeIndex() {
    await ctx.globalState.update(GLOBAL_INDEX_KEY, index);
}
function updateIndexOnWrite(d) {
    const item = {
        key: d.key,
        sizeBytes: d.sizeBytes,
        lastAccessAt: d.lastAccessAt,
        createdAt: d.createdAt,
    };
    const prev = index.items[d.key];
    if (!prev) {
        index.items[d.key] = item;
        index.totalSizeBytes += d.sizeBytes;
    }
    else {
        index.totalSizeBytes += d.sizeBytes - prev.sizeBytes;
        index.items[d.key] = item;
    }
}
async function gcIfNeeded() {
    const limitBytes = options.DISK_LIMIT_MB * 1024 * 1024;
    if (index.totalSizeBytes <= limitBytes)
        return;
    const arr = Object.values(index.items).sort((a, b) => new Date(a.lastAccessAt).getTime() - new Date(b.lastAccessAt).getTime());
    for (const item of arr) {
        if (index.totalSizeBytes <= limitBytes)
            break;
        try {
            await fs.rm(filePathByKey(item.key), { force: true });
        }
        catch { }
        index.totalSizeBytes -= item.sizeBytes;
        delete index.items[item.key];
    }
    await writeIndex();
}
// -------------------------------
// 공개 API
// -------------------------------
exports.cacheStore = {
    async init(context, opts) {
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
        const arr = Object.values(index.items).sort((a, b) => new Date(b.lastAccessAt).getTime() - new Date(a.lastAccessAt).getTime());
        const pick = arr.slice(0, (0, cacheUtils_1.clamp)(topK, 0, options.MEMORY_LIMIT));
        for (const it of pick) {
            const d = await readDiskEntry(it.key);
            if (!d || (0, cacheUtils_1.isExpired)(d.createdAt, d.ttlMs ?? options.TTL_MS))
                continue;
            touchMemoryLRU(it.key, d.result);
        }
    },
    computeKeyHash,
    async get(parts) {
        ensureInit();
        if (!options.ENABLED)
            return null;
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
                it.lastAccessAt = (0, cacheUtils_1.nowIso)();
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
        if ((0, cacheUtils_1.isExpired)(d.createdAt, ttl)) {
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
        d.lastAccessAt = (0, cacheUtils_1.nowIso)();
        await writeDiskEntry(d);
        updateIndexOnWrite(d);
        await writeIndex();
        return d.result;
    },
    async set(parts, value, raw) {
        ensureInit();
        if (!options.ENABLED)
            return;
        const key = computeKeyHash(parts);
        console.log(`[CACHE] 💾 새 결과 캐시 저장: ${key}`);
        const createdAt = (0, cacheUtils_1.nowIso)();
        const entry = {
            schema: CACHE_SCHEMA_VERSION,
            key,
            namespace: parts.namespace,
            model: parts.model,
            systemPromptVersion: parts.systemPromptVersion,
            preprocess: parts.preprocess,
            createdAt,
            lastAccessAt: createdAt,
            ttlMs: parts.ttlMs ?? options.TTL_MS,
            promptPreview: (0, cacheUtils_1.limitString)(parts.prompt.replace(/\s+/g, " "), 200),
            promptHash: (0, cacheUtils_1.sha256)(parts.prompt),
            result: value,
            raw: options.SAVE_RAW ? raw : undefined,
        };
        touchMemoryLRU(key, value);
        const written = await writeDiskEntry(entry);
        updateIndexOnWrite(written);
        await writeIndex();
        await gcIfNeeded();
    },
    async getOrCompute(parts, producer) {
        ensureInit();
        if (!options.ENABLED) {
            const { result } = await producer();
            return result;
        }
        const key = computeKeyHash(parts);
        if (inflight.has(key))
            return inflight.get(key);
        const p = (async () => {
            const cached = await this.get(parts);
            if (cached)
                return cached;
            const { result, raw } = await producer();
            if (result?.summary || result?.rootCause || result?.suggestion) {
                await this.set(parts, result, raw);
            }
            return result;
        })();
        inflight.set(key, p);
        try {
            return await p;
        }
        finally {
            inflight.delete(key);
        }
    },
    async delByKeyHash(hash) {
        ensureInit();
        memoryLRU.delete(hash);
        try {
            await fs.rm(filePathByKey(hash), { force: true });
        }
        catch { }
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
            await fs.rm(storageDir, { recursive: true, force: true });
        }
        catch { }
        await fs.mkdir(storageDir, { recursive: true });
        index = { items: {}, totalSizeBytes: 0 };
        await writeIndex();
        hitCount = 0;
        missCount = 0;
    },
    async stats() {
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
