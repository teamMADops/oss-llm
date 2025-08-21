// src/log/formatPrompt.ts
export function formatPrompt(params: {
  stepName?: string;
  filename: string;
  logSnippet: string;
}) {
  const { stepName, filename, logSnippet } = params;

  return [
    `너는 GitHub Actions 로그 분석 도우미야.`,
    `아래는 실패(또는 의심) 구간을 발췌한 로그야.`,
    stepName ? `대상 Step: ${stepName}` : undefined,
    `파일: ${filename}`,
    ``,
    `반드시 한국어로 작성해.`,
    `다음 형식의 JSON으로만 답해:`,
    `{`,
    `  "summary": "로그 전체 요약",`,
    `  "rootCause": "실패의 핵심 원인",`,
    `  "suggestion": "해결 방법"`,
    `}`,
    ``,
    `로그 ↓`,
    '```log',
    logSnippet,
    '```',
  ].filter(Boolean).join('\n');
}
