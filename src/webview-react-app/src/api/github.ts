/* eslint-disable @typescript-eslint/no-explicit-any */
// GitHub Actions의 정보를 받아올 소스코드
import { VSCodeAPI, Action, WorkflowRun, LatestRun } from '@/types/api';

declare const acquireVsCodeApi: () => VSCodeAPI | undefined;

// VS Code 환경인지 확인
const isVSCode = typeof acquireVsCodeApi !== 'undefined';
const vscode = isVSCode ? acquireVsCodeApi() : undefined;

// GitHub Actions 관련 API 함수들
export const getActions = (): Promise<Action[]> => {
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
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === 'getActionsResponse') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', messageHandler);
    vscode.postMessage({ command: 'getActions' });
  });
};

export const getLatestRun = (actionId: string): Promise<LatestRun> => {
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
    const messageHandler = (event: MessageEvent) => {
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

export const getRunHistory = (actionId: string): Promise<WorkflowRun[]> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환 (getRunDetails와 동일한 구조)
    return Promise.resolve([
      { 
        id: 'run1', 
        status: 'completed', 
        conclusion: 'success',
        timestamp: '2025-08-15 12:00:34',
        reason: 'Push to main',
        branch: 'main',
        commit: 'a1b2c3d4e5f6',
        author: 'sungwoncho'
      },
      { 
        id: 'run2', 
        status: 'completed', 
        conclusion: 'failure',
        timestamp: '2025-08-15 11:30:22',
        reason: 'Pull request #123',
        branch: 'develop',
        commit: 'b2c3d4e5f6g7',
        author: 'angkmfirefoxygal'
      }
    ]);
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
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

export const getWorkflowFile = (actionId: string): Promise<string> => {
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
    const messageHandler = (event: MessageEvent) => {
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

export const saveWorkflowFile = (actionId: string, content: string): Promise<void> => {
  if (!vscode) {
    // 브라우저 환경에서는 console.log로 출력
    console.log('Mock save:', { actionId, content });
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
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

export const analyzeRun = (runId: string) => {
  if (!vscode) {
    console.warn('Not in a VSCode environment, skipping analyzeRun.');
    return;
  }
  vscode.postMessage({
    command: 'analyzeRun',
    payload: { runId },
  });
};

// [ADD] 모든 actions 중 가장 최근 run 가져오기
export const getLatestRunFromAllActions = (): Promise<any> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve({
      id: 'latest-run-1',
      status: 'completed',
      conclusion: 'success',
      timestamp: '2025-08-20 12:00:34',
      reason: 'Push to main',
      actionId: 'action1'
    });
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === 'getLatestRunFromAllActionsResponse') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', messageHandler);
    vscode.postMessage({
      command: 'getLatestRunFromAllActions'
    });
  });
};

// [ADD] Run 상세 정보 가져오기
export const getRunDetails = (runId: string): Promise<any> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve({
      id: runId,
      status: 'completed',
      conclusion: 'success',
      timestamp: '2025-08-15 12:00:34',
      reason: 'Push to main',
      branch: 'main',
      workflow: 'CI/CD Workflow',
      runNumber: 42,
      duration: '5m 23s',
      commit: 'a1b2c3d4e5f6',
      author: 'sungwoncho',
      jobs: []
    });
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === 'getRunDetailsResponse') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', messageHandler);
    vscode.postMessage({
      command: 'getRunDetails',
      payload: { runId }
    });
  });
};

// [ADD] Run 로그 가져오기
export const getRunLogs = (runId: string): Promise<string> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve(`2025-08-15T12:00:34.123Z [INFO] Starting workflow run
2025-08-15T12:00:35.456Z [INFO] Triggered by push to main branch
2025-08-15T12:00:36.789Z [INFO] Setting up job: build
2025-08-15T12:00:37.012Z [INFO] Running on runner: ubuntu-latest
2025-08-15T12:00:38.345Z [INFO] Checking out code...
2025-08-15T12:00:39.678Z [INFO] Code checkout completed
2025-08-15T12:00:40.901Z [INFO] Setting up Node.js environment
2025-08-15T12:00:41.234Z [INFO] Node.js version: 20.x
2025-08-15T12:00:42.567Z [INFO] Installing dependencies...
2025-08-15T12:00:43.890Z [INFO] npm ci --prefer-offline --no-audit
2025-08-15T12:00:45.123Z [INFO] Dependencies installed successfully
2025-08-15T12:00:46.456Z [INFO] Running linting checks...
2025-08-15T12:00:47.789Z [INFO] ESLint: No issues found
2025-08-15T12:00:48.012Z [INFO] Running tests...
2025-08-15T12:00:49.345Z [INFO] Test suite completed: 127 tests passed
2025-08-15T12:00:50.678Z [INFO] Building application...
2025-08-15T12:00:51.901Z [INFO] Build completed successfully
2025-08-15T12:00:52.234Z [INFO] Uploading build artifacts...
2025-08-15T12:00:53.567Z [INFO] Artifacts uploaded successfully
2025-08-15T12:00:54.890Z [INFO] Workflow completed successfully`);
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === 'getRunLogsResponse') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', messageHandler);
    vscode.postMessage({
      command: 'getRunLogs',
      payload: { runId }
    });
  });
};
