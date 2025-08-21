"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveWorkflowFile = exports.getWorkflowFile = exports.getRunHistory = exports.getLatestRun = exports.getActions = void 0;
// VS Code 환경인지 확인
const isVSCode = typeof acquireVsCodeApi !== 'undefined';
const vscode = isVSCode ? acquireVsCodeApi() : undefined;
// GitHub Actions 관련 API 함수들
const getActions = () => {
    if (!vscode) {
        // 브라우저 환경에서는 mock 데이터 반환
        return Promise.resolve([
            { id: 'action1', name: 'Action one_happy', status: 'success' },
            { id: 'action2', name: 'Action twooo', status: 'failed' },
            { id: 'action3', name: 'Action three', status: 'success' },
            { id: 'action4', name: 'Action four', status: 'success' },
            { id: 'action5', name: 'Action five', status: 'failed' }
        ]);
    }
    return new Promise((resolve) => {
        const messageHandler = (event) => {
            if (event.data.command === 'getActionsResponse') {
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload);
            }
        };
        window.addEventListener('message', messageHandler);
        vscode.postMessage({ command: 'getActions' });
    });
};
exports.getActions = getActions;
const getLatestRun = (actionId) => {
    if (!vscode) {
        // 브라우저 환경에서는 mock 데이터 반환
        return Promise.resolve({
            id: 'run1',
            status: 'completed',
            conclusion: 'success',
            timestamp: '2025-08-15 12:00:34',
            reason: 'Push to main'
        });
    }
    return new Promise((resolve) => {
        const messageHandler = (event) => {
            if (event.data.command === 'getLatestRunResponse') {
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload);
            }
        };
        window.addEventListener('message', messageHandler);
        vscode.postMessage({
            command: 'getLatestRun',
            payload: { actionId }
        });
    });
};
exports.getLatestRun = getLatestRun;
const getRunHistory = (actionId) => {
    if (!vscode) {
        // 브라우저 환경에서는 mock 데이터 반환
        return Promise.resolve([
            {
                id: 'run1',
                status: 'completed',
                conclusion: 'success',
                timestamp: '2025-08-15 12:00:34',
                reason: 'Push to main'
            },
            {
                id: 'run2',
                status: 'completed',
                conclusion: 'failure',
                timestamp: '2025-08-15 11:30:22',
                reason: 'Pull request #123'
            }
        ]);
    }
    return new Promise((resolve) => {
        const messageHandler = (event) => {
            if (event.data.command === 'getRunHistoryResponse') {
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload);
            }
        };
        window.addEventListener('message', messageHandler);
        vscode.postMessage({
            command: 'getRunHistory',
            payload: { actionId }
        });
    });
};
exports.getRunHistory = getRunHistory;
const getWorkflowFile = (actionId) => {
    if (!vscode) {
        // 브라우저 환경에서는 mock 데이터 반환
        return Promise.resolve(`name: Mock Workflow
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest`);
    }
    return new Promise((resolve) => {
        const messageHandler = (event) => {
            if (event.data.command === 'getWorkflowFileResponse') {
                window.removeEventListener('message', messageHandler);
                resolve(event.data.payload);
            }
        };
        window.addEventListener('message', messageHandler);
        vscode.postMessage({
            command: 'getWorkflowFile',
            payload: { actionId }
        });
    });
};
exports.getWorkflowFile = getWorkflowFile;
const saveWorkflowFile = (actionId, content) => {
    if (!vscode) {
        // 브라우저 환경에서는 console.log로 출력
        console.log('Mock save:', { actionId, content });
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const messageHandler = (event) => {
            if (event.data.command === 'saveWorkflowFileResponse') {
                window.removeEventListener('message', messageHandler);
                resolve();
            }
        };
        window.addEventListener('message', messageHandler);
        vscode.postMessage({
            command: 'saveWorkflowFile',
            payload: { actionId, content }
        });
    });
};
exports.saveWorkflowFile = saveWorkflowFile;
