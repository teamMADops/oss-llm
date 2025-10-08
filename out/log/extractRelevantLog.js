"use strict";
// // src/log/extractRelevantLog.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRelevantLog = extractRelevantLog;
function extractRelevantLog(content, mode = 'all', options) {
    const tailLines = options?.tailLines ?? 800;
    const errorWindow = options?.errorWindow ?? 300;
    const lines = content.split(/\r?\n/);
    if (mode === 'error') {
        const errIdx = [];
        const errRe = /(error|failed|npm ERR!|ERR!|Traceback|Exception|AssertionError|Segmentation fault)/i;
        lines.forEach((l, i) => { if (errRe.test(l))
            errIdx.push(i); });
        if (errIdx.length === 0) {
            // 에러 키워드 못 찾으면 꼬리만
            return lines.slice(Math.max(0, lines.length - tailLines)).join('\n');
        }
        // 에러 인덱스들 주변을 합친 윈도우
        const keep = new Set();
        for (const i of errIdx) {
            const s = Math.max(0, i - errorWindow);
            const e = Math.min(lines.length - 1, i + errorWindow);
            for (let k = s; k <= e; k++)
                keep.add(k);
        }
        const picked = [];
        let last = -2;
        for (let i = 0; i < lines.length; i++) {
            if (keep.has(i)) {
                if (i - last > 1)
                    picked.push('--- context ---');
                picked.push(lines[i]);
                last = i;
            }
        }
        return picked.join('\n');
    }
    // mode === 'all'
    return lines.slice(Math.max(0, lines.length - tailLines)).join('\n');
}
