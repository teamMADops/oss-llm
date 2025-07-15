// src/log/extractRelevantLog.ts

export function extractRelevantLog(text: string, mode: 'all' | 'tail' = 'tail'): string {
  const lines = text.split('\n');

  if (mode === 'all') {
    console.log('[📄] 전체 로그 사용');
    return text;
  }

  const sliced = lines.slice(-20).join('\n');
  console.log(`[📄] 마지막 20줄 추출 (${lines.length}줄 중)`);

  return sliced;
}
