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
exports.getRunIdFromQuickPick = getRunIdFromQuickPick;
const vscode = __importStar(require("vscode"));
async function getRunIdFromQuickPick(octokit, owner, repo) {
    console.log(`[🔁] run 목록 가져오는 중... (${owner}/${repo})`);
    try {
        const runs = await octokit.actions.listWorkflowRunsForRepo({ owner, repo });
        const items = runs.data.workflow_runs.map(run => ({
            label: `#${run.id} - ${run.name}`,
            description: `Status: ${run.status} | Conclusion: ${run.conclusion}`,
            run_id: run.id
        }));
        console.log(`[📋] 총 ${items.length}개 run 불러옴`);
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '실패한 Run을 선택하세요'
        });
        if (selected) {
            console.log(`[👉] 선택된 run_id: ${selected.run_id}`);
            return selected.run_id;
        }
        else {
            console.log(`[⛔] 사용자가 run 선택 안함`);
            return undefined;
        }
    }
    catch (err) {
        console.error(`[❌] run 목록 불러오기 실패:`, err);
        vscode.window.showErrorMessage('워크플로우 목록을 가져오는 데 실패했습니다.');
        return undefined;
    }
}
