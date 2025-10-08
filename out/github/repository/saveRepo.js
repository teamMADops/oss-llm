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
exports.default = saveRepo;
const vscode = __importStar(require("vscode"));
const Constants_1 = require("./Constants");
const getSavedRepoInfo_1 = __importDefault(require("./getSavedRepoInfo"));
const formatRepoInfo_1 = __importDefault(require("./formatRepoInfo"));
const normalizeInputAsRepoInfo_1 = __importDefault(require("./normalizeInputAsRepoInfo"));
async function saveRepo(context) {
    const repoInfo = await getRepoInfo(context);
    if (repoInfo) {
        await context.globalState.update(Constants_1.KEY, `${repoInfo.owner}/${repoInfo.repo}`);
        vscode.window.showInformationMessage(`✅ 레포 저장됨: ${(0, formatRepoInfo_1.default)(repoInfo)}`);
    }
}
async function getRepoInfo(context) {
    const savedRepo = (0, getSavedRepoInfo_1.default)(context);
    const input = await vscode.window.showInputBox({
        prompt: "저장할 GitHub 레포를 입력하세요 (owner/repo 또는 GitHub URL)",
        placeHolder: "ex) yourGithubName/yourRepoName",
        value: savedRepo ? (0, formatRepoInfo_1.default)(savedRepo) : "",
        ignoreFocusOut: true,
        validateInput: (text) => (0, normalizeInputAsRepoInfo_1.default)(text)
            ? null
            : "owner/repo 또는 유효한 GitHub URL 형식이어야 합니다.",
    });
    if (!input)
        return null;
    return (0, normalizeInputAsRepoInfo_1.default)(input);
}
