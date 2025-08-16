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
exports.getOctokitViaVSCodeAuth = getOctokitViaVSCodeAuth;
// auth/githubSession.ts
const vscode = __importStar(require("vscode"));
const rest_1 = require("@octokit/rest");
const GITHUB_PROVIDER = 'github';
// 필요한 권한만 요청: private repo면 'repo', 워크플로 조회/로그엔 'workflow'
const SCOPES = ['repo', 'workflow']; // org 리소스 읽음이 필요하면 'read:org' 추가
async function getOctokitViaVSCodeAuth() {
    // 없으면 로그인 UI 뜸 (브라우저 리디렉션)
    const session = await vscode.authentication.getSession(GITHUB_PROVIDER, SCOPES, { createIfNone: true });
    if (!session)
        return null;
    // VS Code가 발급/보관한 accessToken을 바로 사용
    return new rest_1.Octokit({ auth: session.accessToken });
}
