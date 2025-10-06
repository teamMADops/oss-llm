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
    if (!existing)
        return true;
    // 2) 가장 호환성 좋은 기본 명령 시도
    try {
        await vscode.commands.executeCommand("github.signout");
        return true;
    }
    catch { }
    // 3) 워크벤치 계정 패널 경유(환경별로 지원/미지원 가능)
    try {
        await vscode.commands.executeCommand("workbench.action.accounts.signOutOfAuthenticationProvider", { id: Constants_1.GITHUB_PROVIDER, label: "GitHub" });
        return true;
    }
    catch { }
    // 4) 마지막 안내
    vscode.window.showInformationMessage("로그아웃 명령을 사용할 수 없습니다. 좌측 하단 Accounts(계정) 메뉴에서 GitHub 계정을 수동으로 Sign Out 해주세요.");
    return false;
}
