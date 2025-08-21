"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOctokit = void 0;
const rest_1 = require("@octokit/rest");
const makeOctokit = () => new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
exports.makeOctokit = makeOctokit;
