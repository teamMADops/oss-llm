// src/llm/prompts.ts
import type { SecondPassInput, SuspectedPath } from "../types/types";

/**
 * 1차(로그만) 분석용 프롬프트 빌더
 * - 로그 조각(핵심 발췌) 하나를 받아 LLM이 요약/원인/제안/키에러(+선택적으로 suspectedPaths)까지 뽑도록 유도
 * - analyze.ts에서 system 지침은 별도로 넣고, 이 함수는 user 메시지 content만 넘긴다는 가정
 */
export function buildFirstPassPrompt(logChunk: string): string {
  const guide = [
    "다음은 GitHub Actions 실패 로그의 일부입니다.",
    "핵심만 분석하여 JSON만 출력하세요. 마크다운, 코드펜스, 설명 문장 금지.",
    "만약 로그 내용이 비어 있거나 분석할 수 없는 경우, '분석할 로그가 없습니다.'와 같은 메시지를 summary 필드에 담아 JSON 형식으로 반환해 주세요.",
    "",
    "요구 키:",
    "- summary: 2~3문장 요약(~습니다).",
    "- rootCause: 실패의 핵심 원인 한 문장(~습니다).",
    "- suggestion: 즉시 시도 가능한 구체적 조치(명령어/파일경로/설정키 등 구체적, ~합니다). 아래 내용을 포함해야 합니다:",
    "  1. 수정이 필요한 코드 라인 또는 영역에 대한 설명 (예: buggyModule.ts의 19번째 줄)",
    "  2. 가능한 해결 방법 2~3가지 (예: null 체크 추가, 타입 선언 보완, 예외 처리 등)",
    "  3. 실제 동작 가능한 코드 예시(있는 경우에만, 주석·코드펜스 없이).",
    "  4. 관련 명령어나 참고 문서 링크 (예: npm install, MDN 문서 URL 등)",
    "  출력 예시:",
    '  \"suggestion\": \"1) buggyModule.ts의 user.email 접근 전 null 체크를 추가합니다.\\n2) User 인터페이스에서 email을 string | null 타입으로 선언합니다.\\n3) 예시: if (user?.email) return user.email.toUpperCase(); else console.warn(\\\"Email 없음\\\");\"',

    "- failureType: dependency|network|tooling|permissions|config|test|infra 중 하나 권장.",
    "- confidence: 0~1 숫자.",
    "- affectedStep: 관련된 CI 스텝명(있으면).",
    "- filename: 분석 로그 파일명/섹션명(있으면).",
    "- keyErrors: [{ line, snippet, note }].",
    // 필요시 의심 경로도 함께 뽑고 싶다면 주석 해제
    // "- suspectedPaths: [{ path, reason, score, linesHint }]",
    "",
    "출력 시 주의사항(절대 금지):",
    "- '출력 예시', '예시 코드 블록' 등의 안내 문구를 생성하지 마세요.",
    "- 예시 코드가 실제로 필요할 때만 포함하세요.",
    "- 코드 예시는 JSON 문자열 내부에서 줄바꿈(\\n)을 이용해 표현하세요.",
    "- 불필요한 설명 문장, 해설, 마크다운, 코드펜스 금지.",
    "- 모든 문장은 정중체(~합니다)로 작성하세요.",
    "",
  ];
  return [guide.join("\n"), logChunk].join("\n");
}

/**
 * 2차(로그+코드) 정밀 분석 프롬프트 빌더
 * - 선택된 의심 지점에 대해: 로그 발췌 + 코드 윈도우를 동시 제공
 * - LLM이 파일/라인/패치(unified diff)/체크리스트까지 반환하도록 강제
 */
export function buildSecondPassPrompt(input: SecondPassInput): string {
  const { path, logExcerpt, codeWindow, lineHint, context } = input;

  const header = [
    "다음은 특정 의심 지점에 대한 정밀 분석 요청입니다.",
    "입력으로 CI 실패 로그 발췌와 해당 파일의 코드 윈도우를 제공합니다.",
    "분석 결과는 반드시 JSON만 출력합니다. 마크다운/설명/코드펜스 금지.",
    "",
    "반드시 포함할 키:",
    '- file: 문제 파일 경로(문자열, 예: "src/app.ts").',
    "- startLine: 패치 시작 라인(가능하면 추정).",
    "- endLine: 패치 끝 라인(가능하면 추정).",
    '- unifiedDiff: UNIX unified diff 포맷 문자열(---/+++/@@ 포함).',
    "- checklist: PR 전 수동 확인 항목 배열(각 항목 ~하세요/~입니다).",
    "- confidence: 0~1 숫자.",
    "",
    "추가 지침:",
    "- 패치는 최소 수정 원칙을 따르세요.",
    "- 만약 환경/네트워크 이슈 등 코드 변경이 부적절하면 unifiedDiff는 빈 문자열로 두고 checklist에 조치 사항을 구체적으로 제시하세요.",
    "- 사고과정(chain-of-thought) 노출 금지.",
    "",
    `대상 파일 경로: ${path}`,
    lineHint ? `의심 라인 힌트: ${lineHint}` : undefined,
    context?.workflow ? `워크플로우: ${context.workflow}` : undefined,
    context?.step ? `스텝: ${context.step}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const sections = [
    header,
    "",
    "=== 실패 로그 발췌 시작 ===",
    logExcerpt.trim(),
    "=== 실패 로그 발췌 끝 ===",
    "",
    "=== 코드 윈도우 시작 ===",
    codeWindow.trim(),
    "=== 코드 윈도우 끝 ===",
  ];

  return sections.join("\n");
}
