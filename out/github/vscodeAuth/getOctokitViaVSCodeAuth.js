"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getOctokitViaVSCodeAuth;
const rest_1 = require("@octokit/rest");
const getGithubSession_1 = __importDefault(require("./getGithubSession"));
async function getOctokitViaVSCodeAuth() {
    const createIfNone = true; // 없으면 로그인 UI 뜸 (브라우저 리디렉션)
    const session = await (0, getGithubSession_1.default)(createIfNone);
    if (!session)
        return null;
    return new rest_1.Octokit({ auth: session.accessToken });
}
