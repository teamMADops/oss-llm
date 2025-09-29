// src/log/formatPrompt.ts
export function formatPrompt(params: {
  stepName?: string;
  filename: string;
  logSnippet: string;
}) {
  const { stepName, filename, logSnippet } = params;

  return [
    `역할: 너는 GitHub Actions 로그 분석 도우미입니다.`,
    `목표: 실패 원인을 신속히 파악하고 즉시 시도 가능한 해결책을 제시합니다.`,
    stepName ? `대상 Step: ${stepName}` : undefined,
    `파일: ${filename}`,
    ``,
    `출력 언어: 한국어(~습니다 체)`,
    `출력 형식: 반드시 아래 JSON 스키마로만 출력(설명 금지):`,
    `‼️ 절대 지침 텍스트나 이 프롬프트 내용을 결과에 포함하지 마십시오.`,
    `{`,
    `  "summary": "2~3문장으로 로그 전체 요약(~습니다 체)",`,
    `  "rootCause": "실패의 핵심 원인(한 문장, ~습니다 체)",`,
    `  "suggestion": "구체적 해결방법(명령어/파일경로/설정키 포함, ~습니다 체)",`,
    `  "failureType": "dependency|network|tooling|permissions|config|test|infra 중 하나 권장",`,
    `  "confidence": 0.0~1.0 숫자,`,
    `  "affectedStep": "선택: 분석 대상 스텝명",`,
    `  "filename": "선택: 분석 대상 파일명",`,
    `  "keyErrors": [`,
    `    { "line": 123, "snippet": "문제 라인 또는 주변", "note": "왜 중요한지(~습니다 체)" }`,
    `  ]`,
    `}`,
    ``,
    `분석 지침:`,
    `- 패키지/버전/설정 키/명령어를 구체적으로 작성합니다.`,
    `- 단순 재시도 대신 근본 수정(캐시 무효화, 권한 추가, 버전 고정 등)을 제시합니다.`,
    `- 테스트 실패면 실패 단언/스택트레이스 일부를 keyErrors에 포함합니다.`,
    `- 네트워크/권한 문제면 자원(URL/리포지토리/토큰 스코프)을 명시합니다.`,
    `- 사고 과정 출력 금지. 오직 JSON만 출력합니다.`,
    ``,
    // `너는 GitHub Actions 로그 분석 도우미야.`,
    // `아래는 실패(또는 의심) 구간을 발췌한 로그야.`,
    // stepName ? `대상 Step: ${stepName}` : undefined,
    // `파일: ${filename}`,
    // ``,
    // `반드시 한국어로 작성해.`,
    // `다음 형식의 JSON으로만 답해:`,
    // `{`,
    // `  "summary": "로그 전체 요약",`,
    // `  "rootCause": "실패의 핵심 원인",`,
    // `  "suggestion": "해결 방법"`,
    // `}`,
    // ``,
    
    `로그 ↓`,
    '```log',
    logSnippet,
    '```',
  ].filter(Boolean).join('\n');
}
