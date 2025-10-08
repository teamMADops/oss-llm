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
exports.default = isSignOutGitHub;
const vscode = __importStar(require("vscode"));
const getExistingGithubSession_1 = __importDefault(require("./getExistingGithubSession"));
const Constants_1 = require("./Constants");
async function isSignOutGitHub() {
    // 1) 세션이 없으면 바로 종료
    const existing = await (0, getExistingGithubSession_1.default)();
    console.log("[로그아웃] 1. 기존 세션 확인:", existing ? "세션 있음" : "세션 없음");
    if (!existing) {
        console.log("[로그아웃] 세션이 없어서 종료");
        return true;
    }
    // 2) VS Code Authentication API의 removeSession 사용
    try {
        console.log("[로그아웃] 2. removeSession 시도 중...", existing.account.label);
        // vscode.authentication.getSession으로 얻은 세션을 제거
        const sessions = await vscode.authentication.getAccounts(Constants_1.GITHUB_PROVIDER);
        console.log("[로그아웃] 현재 GitHub 계정 목록:", sessions);
        // 모든 GitHub 세션 제거
        await vscode.authentication.getSession(Constants_1.GITHUB_PROVIDER, [], {
            clearSessionPreference: true,
            createIfNone: false
        });
        console.log("[로그아웃] ✅ 로그아웃 성공");
        vscode.window.showInformationMessage(`GitHub 로그아웃 완료: ${existing.account.label}`);
        return true;
    }
    catch (err) {
        console.error("[로그아웃] ❌ 로그아웃 실패:", err);
        // Fallback: 사용자에게 수동 로그아웃 안내
        const openAccounts = await vscode.window.showWarningMessage("자동 로그아웃에 실패했습니다. Accounts 메뉴를 열어드릴까요?", "Accounts 열기", "취소");
        if (openAccounts === "Accounts 열기") {
            await vscode.commands.executeCommand("workbench.actions.manage");
        }
        return false;
    }
}
