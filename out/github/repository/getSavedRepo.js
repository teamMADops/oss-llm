"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedRepo = getSavedRepo;
const Constants_1 = require("./Constants");
const normalizeInputAsRepoInfo_1 = __importDefault(require("./normalizeInputAsRepoInfo"));
function getSavedRepo(context) {
    const saved = context.globalState.get(Constants_1.KEY);
    if (!saved)
        return null;
    return (0, normalizeInputAsRepoInfo_1.default)(saved);
}
