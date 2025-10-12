// src/llm/cache/cache.ts
import * as vscode from "vscode";
import type { LLMResult } from "../types";
import {
  cacheStore,
  type KeyParts,
  type InitOptions,
  type CacheStats,
} from "./cacheStore";

export function createCache<T>() {
  return {
    init: (context: vscode.ExtensionContext, opts?: InitOptions) =>
      cacheStore.init(context, opts),

    warmup: (topK?: number) => cacheStore.warmup(topK),

    get: (parts: KeyParts): Promise<T | null> =>
      cacheStore.get(parts) as Promise<T | null>,

    set: (parts: KeyParts, value: T, raw?: string) =>
      cacheStore.set(parts, value as any, raw),

    getOrCompute: (
      parts: KeyParts,
      producer: () => Promise<{ result: T; raw?: string }>
    ): Promise<T> =>
      cacheStore.getOrCompute(
        parts,
        producer as any
      ) as Promise<T>,

    delByKeyHash: (hash: string) => cacheStore.delByKeyHash(hash),

    clearAll: () => cacheStore.clearAll(),

    stats: (): Promise<CacheStats> => cacheStore.stats(),

    computeKeyHash: (parts: KeyParts) => cacheStore.computeKeyHash(parts),
  };
}
