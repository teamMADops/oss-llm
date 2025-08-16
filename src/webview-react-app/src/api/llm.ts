// @ts-expect-error: acquireVsCodeApi is provided by the webview environment
const vscode = acquireVsCodeApi();

export const analyzeLog = (logContent: string) => {
    vscode.postMessage({ command: 'analyzeLog', payload: { logContent } });
};
