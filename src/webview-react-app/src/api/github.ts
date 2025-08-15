// GitHub Actions의 정보를 받아올 소스코드
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
} | undefined;

// VS Code 환경인지 확인
const isVSCode = typeof acquireVsCodeApi !== 'undefined';
const vscode = isVSCode ? acquireVsCodeApi() : undefined;

// GitHub Actions 관련 API 함수들
export const getActions = (): Promise<any[]> => {
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

export const getLatestRun = (actionId: string): Promise<any> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve({ id: 'run1', status: 'completed', conclusion: 'success' });
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

export const getRunHistory = (actionId: string): Promise<any[]> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve([
      { id: 'run1', status: 'completed', conclusion: 'success' },
      { id: 'run2', status: 'completed', conclusion: 'failed' }
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