// src/llm/suspects.ts
import type { SuspectedPath } from "./types";

/**
 * 실패 로그에서 파일/라인 패턴을 찾아 의심 지점을 추출하고 간단 스코어를 매겨 반환.
 * - 언어/툴별 흔한 포맷 정규식 포함 (TS/JS 스택, Python, Java, Go, ESLint/TS/Jest 등)
 * - 각 매칭 지점 주변으로 로그 발췌(logExcerpt)를 만들어 2차 프롬프트에 바로 사용 가능
 */
export function extractSuspects(
  logText: string,
  opts?: { max?: number; excerptPadding?: number }
): SuspectedPath[] {
  const MAX = opts?.max ?? 10;
  const PADDING = opts?.excerptPadding ?? 40; // 매칭 근처 전후 줄 수

  const lines = splitLines(logText);
  const candidates: SuspectCandidate[] = [];

  // 정규식 패턴 세트
  const patterns: PatternSpec[] = [
    // 1) TS/JS 스택트레이스: at Foo (src/app.ts:123:45)
    {
      name: "jsStack",
      regex: /\b(?:at\s+[^\s(]+)?\s*\(?([A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs)):(\d+)(?::\d+)?\)?/g,
      weight: 0.5,
    },
    // 2) 일반 파일:라인:열 (webpack 등)
    {
      name: "genericColon",
      regex: /\b([A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs|css|scss|vue|go|py|java|kt|rb|rs|cs|cpp|c|h)):(\d+)(?::\d+)?\b/g,
      weight: 0.45,
    },
    // 3) Python: File "app.py", line 210
    {
      name: "python",
      regex: /File\s+"([A-Za-z0-9_./-]+\.py)",\s+line\s+(\d+)/g,
      weight: 0.5,
    },
    // 4) Java: (Foo.java:57)
    {
      name: "java",
      regex: /\(([A-Za-z0-9_./-]+\.java):(\d+)\)/g,
      weight: 0.5,
    },
    // 5) Go: path/file.go:123 + 함수명 등
    {
      name: "go",
      regex: /\b([A-Za-z0-9_./-]+\.go):(\d+)\b/g,
      weight: 0.45,
    },
    // 6) ESLint: path/file.ts:10:5 - Rule message
    {
      name: "eslint",
      regex: /\b([A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx)):(\d+):\d+\s+-\s+/g,
      weight: 0.55,
    },
    // 7) TypeScript tsc: path/file.ts(123,7): error TSxxxx
    {
      name: "tsc",
      regex: /\b([A-Za-z0-9_./-]+\.tsx?)\((\d+),\d+\):\s+error\s+TS\d+/g,
      weight: 0.55,
    },
    // 8) Jest: at Object.<anonymous> (src/foo.test.ts:88:11)
    {
      name: "jest",
      regex: /\(([A-Za-z0-9_./-]+\.(?:test|spec)\.tsx?):(\d+):\d+\)/g,
      weight: 0.5,
    },
  ];

  // 라인별로 패턴 스캔
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      p.regex.lastIndex = 0; // 안전: 전역 정규식 포인터 리셋
      let m: RegExpExecArray | null;
      while ((m = p.regex.exec(line)) !== null) {
        const rawPath = m[1];
        const lineNum = safeInt(m[2]);
        if (!rawPath) continue;
        const path = normalizePath(rawPath);

        const reason = `[${p.name}] ${line.trim().slice(0, 240)}`;
        const logExcerpt = makeExcerpt(lines, idx, PADDING);

        const baseScore = p.weight;
        const exactLineBonus = lineNum ? 0.3 : 0;
        const fileDepthBonus = path.includes("/") ? 0.1 : 0; // 대충 src/.. 등
        const penaltyGen = isGeneratedOrVendor(path) ? -0.2 : 0;

        const score = clamp01(baseScore + exactLineBonus + fileDepthBonus + penaltyGen);

        candidates.push({
          path,
          lineHint: lineNum ?? undefined,
          score,
          reason,
          excerpt: logExcerpt,
          hitLineIndex: idx,
        });
      }
    }
  });

  // 중복 제거: 같은 path + lineHint는 하나로
  const dedupMap = new Map<string, SuspectCandidate>();
  for (const c of candidates) {
    const key = `${c.path}#${c.lineHint ?? "?"}`;
    const prev = dedupMap.get(key);
    if (!prev || c.score > prev.score) {
      dedupMap.set(key, c);
    }
  }

  // 정렬 + 상위 N 슬라이스
  const deduped = Array.from(dedupMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX);

  // SuspectedPath 형태로 변환
  const result: SuspectedPath[] = deduped.map((c) => ({
    path: c.path,
    reason: c.reason,
    score: clamp01(c.score),
    lineHint: c.lineHint,
    logExcerpt: c.excerpt,
  }));

  return result;
}

/* 내부 타입 */
type SuspectCandidate = {
  path: string;
  lineHint?: number;
  score: number;
  reason: string;
  excerpt: string;
  hitLineIndex: number;
};

type PatternSpec = {
  name: string;
  regex: RegExp;
  weight: number; // 기본 가중치
};

/* 유틸들 */

function splitLines(text: string): string[] {
  // 윈도우/유닉스 개행 모두 대응
  return text.split(/\r?\n/);
}

function makeExcerpt(lines: string[], centerIndex: number, padding: number): string {
  const start = Math.max(0, centerIndex - padding);
  const end = Math.min(lines.length, centerIndex + padding + 1);
  return lines.slice(start, end).join("\n").trim();
}

function normalizePath(p: string): string {
  // 백슬래시 -> 슬래시, 중복 슬래시 정리
  return p.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function safeInt(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function isGeneratedOrVendor(path: string): boolean {
  // 노이즈/생성물/서드파티: 점수 약간 패널티
  return (
    /(^|\/)(dist|out|build|coverage|vendor|node_modules)(\/|$)/.test(path) ||
    /\.min\.(js|css)$/.test(path) ||
    /\.map$/.test(path)
  );
}

