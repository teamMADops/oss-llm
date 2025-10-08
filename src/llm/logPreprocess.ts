// src/llm/logPreprocess.ts
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function stripAnsi(text: string): string {
  // 터미널 색상/제어코드 제거
  return text.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    ""
  );
}

export function extractErrorLines(text: string): string {
  const lines = text.split(/\r?\n/);
  const re = /(error|failed|fail|exception|traceback|cannot|fatal|segmentation fault)/i;
  const picked = lines.filter(l => re.test(l));
  // 에러 라인이 전혀 없으면 원문 반환해서 다음 단계(tail)로 넘김
  return picked.length ? picked.join("\n") : text;
}

export function tailLines(text: string, n = 500): string {
  const lines = text.split(/\r?\n/);
  return lines.slice(-n).join("\n");
}

export function preprocessLogForLLM(
  raw: string,
  opts?: {
    maxTokens?: number;     // 전체 허용 토큰(대략)
    safetyMargin?: number;  // 시스템/지침/프롬프트 여유
    tailCount?: number;     // 너무 길면 남길 끝부분 줄 수
    maxCharsHard?: number;  // 혹시 모를 최종 하드컷
  }
): string {
  const {
    maxTokens = 16000,
    safetyMargin = 1000, // system+guide 여유
    tailCount = 600,
    maxCharsHard = 120_000, // 비상 하드컷
  } = opts || {};

  let text = stripAnsi(raw);

  const limit = Math.max(1000, maxTokens - safetyMargin);
  if (estimateTokens(text) > limit) {
    const onlyErrors = extractErrorLines(text);
    text = estimateTokens(onlyErrors) <= limit ? onlyErrors : tailLines(onlyErrors, tailCount);
  }

  if (estimateTokens(text) > limit) {
    text = tailLines(text, tailCount);
  }

  if (text.length > maxCharsHard) {
    text = text.slice(-maxCharsHard);
  }
  return text;
}
