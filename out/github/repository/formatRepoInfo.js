"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = formatRepoInfo;
function formatRepoInfo(repoInfo) {
    return repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "(none)";
}
