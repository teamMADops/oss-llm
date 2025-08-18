"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoInfo = getRepoInfo;
async function getRepoInfo() {
    // 하드코딩된 리포지토리 정보 사용
    const owner = 'angkmfirefoxygal';
    const repo = 'oss';
    console.log(`[🔍] 하드코딩된 리포지토리 정보: ${owner}/${repo}`);
    return { owner, repo };
}
