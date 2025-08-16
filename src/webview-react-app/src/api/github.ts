// @ts-expect-error: acquireVsCodeApi is provided by the webview environment
const vscode = acquireVsCodeApi();

export const getActions = () => {
  vscode.postMessage({ command: 'getActions' });
};

export const getLatestRun = (actionId: string) => {
  vscode.postMessage({ command: 'getLatestRun', payload: { actionId } });
};

export const getRunHistory = (actionId: string) => {
  vscode.postMessage({ command: 'getRunHistory', payload: { actionId } });
};

export const getWorkflowFile = (actionId: string) => {
    vscode.postMessage({ command: 'getWorkflowFile', payload: { actionId } });
};

export const saveWorkflowFile = (actionId: string, content: string) => {
    vscode.postMessage({ command: 'saveWorkflowFile', payload: { actionId, content } });
};
