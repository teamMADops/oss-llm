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
exports.getGitHubToken = getGitHubToken;
// src/auth/tokenManager.ts
const vscode = __importStar(require("vscode"));
const TOKEN_KEY = 'github_token';
async function getGitHubToken(context) {
    let token = context.workspaceState.get(TOKEN_KEY);
    if (token) {
        console.log('[🔐] 저장된 GitHub 토큰 사용');
        return token;
    }
    console.log('[📝] GitHub 토큰 없음 → 사용자 입력 필요');
    token = await vscode.window.showInputBox({
        prompt: 'GitHub Personal Access Token을 입력하세요',
        password: true,
        ignoreFocusOut: true
    });
    if (token) {
        await context.workspaceState.update(TOKEN_KEY, token);
        console.log('[💾] GitHub 토큰 저장 완료 (workspaceState)');
        return token;
    }
    console.log('[⛔] 사용자 입력 없음 → 토큰 불러오기 실패');
    return undefined;
}
