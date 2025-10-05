"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getExistingGitHubSession;
const getGithubSession_1 = __importDefault(require("./getGithubSession"));
async function getExistingGitHubSession() {
    try {
        const silent = true;
        const session = await (0, getGithubSession_1.default)(silent);
        return session ?? undefined;
    }
    catch {
        return undefined;
    }
}
