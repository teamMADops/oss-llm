"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCache = createCache;
const cacheStore_1 = require("./cacheStore");
function createCache() {
    return {
        init: (context, opts) => cacheStore_1.cacheStore.init(context, opts),
        warmup: (topK) => cacheStore_1.cacheStore.warmup(topK),
        get: (parts) => cacheStore_1.cacheStore.get(parts),
        set: (parts, value, raw) => cacheStore_1.cacheStore.set(parts, value, raw),
        getOrCompute: (parts, producer) => cacheStore_1.cacheStore.getOrCompute(parts, producer),
        delByKeyHash: (hash) => cacheStore_1.cacheStore.delByKeyHash(hash),
        clearAll: () => cacheStore_1.cacheStore.clearAll(),
        stats: () => cacheStore_1.cacheStore.stats(),
        computeKeyHash: (parts) => cacheStore_1.cacheStore.computeKeyHash(parts),
    };
}
