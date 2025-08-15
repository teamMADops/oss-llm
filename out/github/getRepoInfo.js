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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoInfo = getRepoInfo;
// src/github/getRepoInfo.ts
const vscode = __importStar(require("vscode"));
const simple_git_1 = __importDefault(require("simple-git"));
async function getRepoInfo() {
    const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folderUri) {
        console.log('[❌] 워크스페이스 폴더 없음');
        return null;
    }
    console.log(`[📁] Git repo 디렉토리: ${folderUri}`);
    const git = (0, simple_git_1.default)(folderUri);
    try {
        const remotes = await git.getRemotes(true);
        const origin = remotes.find(r => r.name === 'origin');
        if (!origin || !origin.refs.fetch) {
            console.log('[❌] origin remote 없음');
            return null;
        }
        const match = origin.refs.fetch.match(/github\.com[:/](.+?)\/(.+?)\.git/);
        if (match) {
            const [, owner, repo] = match;
            console.log(`[🔍] origin → owner: ${owner}, repo: ${repo}`);
            return { owner, repo };
        }
        else {
            console.log('[❌] GitHub origin 주소 파싱 실패');
            return null;
        }
    }
    catch (err) {
        console.error('[❌] Git repo 정보 가져오기 실패:', err);
        return null;
    }
}
