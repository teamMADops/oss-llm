"use strict";
// src/github/getRepoInfo.ts
// 사용자, repo 이름 가져오기
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
exports.formatRepo = formatRepo;
exports.getSavedRepo = getSavedRepo;
exports.promptAndSaveRepo = promptAndSaveRepo;
exports.deleteSavedRepo = deleteSavedRepo;
const vscode = __importStar(require("vscode"));
/** 전역 저장 키 */
const KEY = 'gh_actions_analyzer.fixed_repo';
/** 보기 좋게 */
function formatRepo(ref) {
    return ref ? `${ref.owner}/${ref.repo}` : '(none)';
}
/** owner/repo 또는 GitHub URL(https/ssh, .git 유무) 파싱 */
function parseOwnerRepo(input) {
    if (!input)
        return null;
    const s = input.trim();
    // 1) owner/repo
    if (/^[^/]+\/[^/]+$/i.test(s)) {
        const [owner, repo] = s.split('/');
        return { owner, repo };
    }
    // 2) GitHub URL (엔터프라이즈/SSH 포함), .git 유무
    const m = s.match(/github[^/:]*[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/i);
    return m ? { owner: m[1], repo: m[2] } : null;
}
/* ------------------------------------------------------------------ */
/* 전역 저장 기반 CRUD (등록/수정/삭제/조회)                         */
/* ------------------------------------------------------------------ */
/** 저장된 레포 읽기 */
function getSavedRepo(context) {
    const saved = context.globalState.get(KEY);
    if (!saved)
        return null;
    const parsed = parseOwnerRepo(saved);
    return parsed;
}
/** 등록/수정: 입력받아 전역 저장 */
async function promptAndSaveRepo(context) {
    const current = getSavedRepo(context);
    const value = await vscode.window.showInputBox({
        prompt: '저장할 GitHub 레포를 입력하세요 (owner/repo 또는 GitHub URL)',
        placeHolder: 'ex) octocat/Hello-World',
        value: current ? formatRepo(current) : '',
        ignoreFocusOut: true,
        validateInput: (text) => (parseOwnerRepo(text) ? null : 'owner/repo 또는 유효한 GitHub URL 형식이어야 합니다.')
    });
    if (!value)
        return null;
    const parsed = parseOwnerRepo(value);
    await context.globalState.update(KEY, `${parsed.owner}/${parsed.repo}`);
    vscode.window.showInformationMessage(`✅ 레포 저장됨: ${formatRepo(parsed)}`);
    return parsed;
}
/** 삭제 */
async function deleteSavedRepo(context) {
    const current = getSavedRepo(context);
    if (!current) {
        vscode.window.showInformationMessage('저장된 레포가 없습니다.');
        return;
    }
    const pick = await vscode.window.showQuickPick(['삭제', '취소'], {
        placeHolder: `현재: ${formatRepo(current)} — 삭제할까요?`
    });
    if (pick !== '삭제')
        return;
    await context.globalState.update(KEY, undefined);
    vscode.window.showInformationMessage('🗑️ 저장된 레포를 삭제했습니다.');
}
