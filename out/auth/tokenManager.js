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
exports.deleteGitHubToken = deleteGitHubToken;
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
    //토큰 발급 페이지로 리디렉션 (만약 토큰이 없다면)
    const selection = await vscode.window.showInformationMessage('GitHub Token이 필요합니다. 브라우저에서 발급하려면 여기를 클릭하세요.', '발급 페이지 열기', '이미 발급함');
    if (selection === '발급 페이지 열기') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens'));
        // 사용자가 발급 완료 후 버튼 누를 때까지 대기
        const confirm = await vscode.window.showInformationMessage('토큰을 복사하셨나요?', '입력하러 가기');
        if (confirm !== '입력하러 가기') {
            vscode.window.showWarningMessage('토큰 입력이 취소되었습니다.');
            return undefined;
        }
    }
    else if (selection !== '이미 발급함') {
        // 사용자가 아무것도 선택 안 하고 닫은 경우
        vscode.window.showWarningMessage('토큰 발급이 취소되었습니다.');
        return undefined;
    }
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
// 토큰 삭제 함수(나중에 필요하게 될지도)
async function deleteGitHubToken(context) {
    await context.workspaceState.update(TOKEN_KEY, undefined);
    vscode.window.showInformationMessage('저장된 GitHub 토큰이 삭제되었습니다.');
}
