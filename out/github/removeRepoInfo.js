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
exports.registerRemoveRepoCommand = registerRemoveRepoCommand;
const vscode = __importStar(require("vscode"));
function registerRemoveRepoCommand(context) {
    return vscode.commands.registerCommand('extension.removeRepoInfo', async () => {
        const current = getFixedRepo(context);
        if (!current) {
            vscode.window.showInformationMessage('저장된 레포가 없습니다.');
            return;
        }
        const pick = await vscode.window.showQuickPick(['삭제', '취소'], {
            placeHolder: `현재: ${formatRepo(current)} — 삭제할까요?`
        });
        if (pick !== '삭제')
            return;
        await clearFixedRepo(context);
        vscode.window.showInformationMessage('🗑️ 저장된 레포가 삭제되었습니다.');
    });
}
