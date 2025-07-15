# OSS - GitHub Actions Analyzer VS Code Extension

이 프로젝트는 **GitHub Actions 실패 로그를 수집하고, 분석 가능한 프롬프트 형태로 출력하는 VS Code 확장 기능**입니다.

## ✨ 주요 기능

###  GitHub Actions Run 실패 로그 수집

* `getRunList.ts` / `getRepoInfo.ts`를 통해 사용자 계정의 워크플로우 실행 정보를 가져옵니다.
* `getFailedLogs.ts`를 통해 실패한 Run의 Job 로그를 다운로드하고 압축 해제합니다.

###  실패 로그 분석 결과 출력

* `extractRelevantLog.ts`: 로그에서 에러 원인 관련 부분만 추출합니다.
* `formatPrompt.ts`: GPT 분석에 적합한 형태로 포맷팅합니다.
* `printToOutput.ts`: 결과를 VS Code Output 창에 출력합니다.

###  VS Code 명령어로 실행 가능

* `Cmd + Shift + P` → `GitHub Actions 실패 로그 분석`
* 결과는 Output 탭에 표시됩니다.

## ⚡ Extension 실행 방법

1. `.env` 파일에 GitHub Token 등록 (classic token 권장)

```
GITHUB_TOKEN=ghp_xxxxxx...
```

2. `Run > Run VS Code Extension`

3. Command Palette(`Cmd + Shift + P`)에서 `GitHub Actions 실패 로그 분석` 실행

4. 실패한 Run ID를 입력하면 해당 Run의 실패 Job 로그를 불러와 분석 결과를 출력합니다.

---

## 🚫 GitHub Actions 실패 원인 예시

* Run #16265851475의 실패 로그를 분석한 결과:

```
exit 1
```

즉, **사용자 워크플로우 내 명시적으로 `exit 1`을 호출**하여 프로세스가 강제로 종료된 상황입니다.
이는 테스트 목적 혹은 스크립트 내 조건 분기 실패 등으로 인해 발생할 수 있습니다.

---

## 🌍 프로젝트 구조 (일부)

```
src/
├─ extension.ts           // main activate() 함수, command 등록
├─ github/
│   ├─ getRepoInfo.ts    // 사용자 repo 정보 수집
│   └─ getRunList.ts     // 워크플로우 실행 목록 수집
├─ log/
│   ├─ extractRelevantLog.ts // 에러 로그 추출
│   └─ formatPrompt.ts       // LLM용 프롬프트 포맷팅
├─ output/
│   └─ printToOutput.ts      // Output 창에 출력
└─ auth/
    └─ tokenManager.ts      // GitHub Token 처리
```

---

## 🚀 TODO

* [ ] Webview 기반 GUI 도입 → Token 입력 / Run 선택 / 분석 결과 보기
* [ ] 실패한 Job 별 로그 탭 표시
* [ ] 분석 결과 복사 기능 추가

---

✨ Made with VS Code API + GitHub REST API + LLM 기반 로그 분석
