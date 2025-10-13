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
exports.default = deleteSavedRepo;
const vscode = __importStar(require("vscode"));
const Constants_1 = require("./Constants");
const getSavedRepoInfo_1 = __importDefault(require("./getSavedRepoInfo"));
const formatRepoInfo_1 = __importDefault(require("./formatRepoInfo"));
async function deleteSavedRepo(context) {
    const savedRepoInfo = (0, getSavedRepoInfo_1.default)(context);
    if (!savedRepoInfo) {
        vscode.window.showInformationMessage("No saved repository found.");
        return;
    }
    const pick = await vscode.window.showQuickPick(["Delete", "Cancel"], {
        placeHolder: `Current: ${(0, formatRepoInfo_1.default)(savedRepoInfo)} — Do you want to delete it?`,
    });
    if (pick !== "Delete")
        return;
    await context.globalState.update(Constants_1.KEY, undefined);
    vscode.window.showInformationMessage("🗑️ Saved repository has been deleted.");
}
