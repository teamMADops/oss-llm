// LLM과 통신하는 API 함수들
import { VSCodeAPI } from '@/types/api';

declare const acquireVsCodeApi: () => VSCodeAPI | undefined;

// VS Code 환경인지 확인
const isVSCode = typeof acquireVsCodeApi !== 'undefined';
const vscode = isVSCode ? acquireVsCodeApi() : undefined;

export const analyzeLog = (logContent: string): Promise<string> => {
  if (!vscode) {
    // 브라우저 환경에서는 mock 데이터 반환
    return Promise.resolve(`Mock LLM 분석 결과:
    
로그 분석이 완료되었습니다.
- 오류 유형: Mock Error
- 해결 방안: Mock Solution
- 권장사항: Mock Recommendation`);
  }

  return new Promise((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === 'analyzeLogResponse') {
        window.removeEventListener('message', messageHandler);
        resolve(event.data.payload);
      }
    };

    window.addEventListener('message', messageHandler);
    vscode.postMessage({
      command: 'analyzeLog',
      payload: { logContent }
    });
  });
};