/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { LLMResult } from '../../../../llm/types';
import { getRunDetails, getRunLogs, analyzeRun, getLatestRunFromAllActions } from '@/api/github';

interface DashboardPageProps {
  actionId: string | null;
  runId: string | null; // [ADD] 선택된 run ID
  isSidebarOpen: boolean;
  llmAnalysisResult: LLMResult | null; // Use LLMResult type
}

// [COMMENT] Mock data for dashboard - 실제 데이터로 대체 예정
// const mockRunInfo = {
//   id: '1234',
//   status: 'completed',
//   conclusion: 'success',
//   timestamp: '2025-08-15 12:00:34',
//   reason: 'Build completed successfully',
//   branch: 'main',
//   workflow: 'CI/CD Workflow',
//   runNumber: 42,
//   duration: '5m 23s',
//   commit: 'a1b2c3d4e5f6',
//   author: 'sungwoncho'
// };

// [COMMENT] TODO : 이거 실제 로그랑 연결해야함!!! - 실제 데이터로 대체 예정
// const mockDetailedLog = `2025-08-15T12:00:34.123Z [INFO] Starting workflow run
// 2025-08-15T12:00:35.456Z [INFO] Triggered by push to main branch
// 2025-08-15T12:00:36.789Z [INFO] Setting up job: build
// 2025-08-15T12:00:37.012Z [INFO] Running on runner: ubuntu-latest
// 2025-08-15T12:00:38.345Z [INFO] Checking out code...
// 2025-08-15T12:00:39.678Z [INFO] Code checkout completed
// 2025-08-15T12:00:40.901Z [INFO] Setting up Node.js environment
// 2025-08-15T12:00:41.234Z [INFO] Node.js version: 20.x
// 2025-08-15T12:00:42.567Z [INFO] Installing dependencies...
// 2025-08-15T12:00:43.890Z [INFO] npm ci --prefer-offline --no-audit
// 2025-08-15T12:00:45.123Z [INFO] Dependencies installed successfully
// 2025-08-15T12:00:46.456Z [INFO] Running linting checks...
// 2025-08-15T12:00:47.789Z [INFO] ESLint: No issues found
// 2025-08-15T12:00:48.012Z [INFO] Running tests...
// 2025-08-15T12:00:49.345Z [INFO] Test suite completed: 127 tests passed
// 2025-08-15T12:00:50.678Z [INFO] Building application...
// 2025-08-15T12:00:51.901Z [INFO] Build completed successfully
// 2025-08-15T12:00:52.234Z [INFO] Uploading build artifacts...
// 2025-08-15T12:00:53.567Z [INFO] Artifacts uploaded successfully
// 2025-08-15T12:00:54.890Z [INFO] Workflow completed successfully`;

// [ADD] 실제 run 정보를 위한 타입
interface RunDetails {
  id: string;
  status: string;
  conclusion: string | null;
  timestamp: string;
  reason: string;
  branch: string;
  workflow: string;
  runNumber: number;
  duration: string;
  commit: string;
  author: string;
  // TODO: jobs 타입 정의 필요
  jobs?: any[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ actionId, runId, isSidebarOpen, llmAnalysisResult }) => {
  const [selectedPanel, setSelectedPanel] = useState<number>(1);
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null);
  const [runLogs, setRunLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isErrorDetailsOpen, setIsErrorDetailsOpen] = useState(false);

  useEffect(() => {
    if (runId) {
      console.log(`Dashboard: runId 변경됨 → ${runId}, 실행 상세 정보를 가져옵니다.`);
      loadRunData(runId);
    } else if (actionId) {
      // [ADD] runId가 없지만 actionId가 있으면 모든 actions 중 가장 최근 run을 가져옴
      console.log(`Dashboard: actionId만 있음 → ${actionId}, 전체 actions 중 가장 최근 run을 가져옵니다.`);
      loadLatestRunFromAllActions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, actionId]);

  const loadRunData = async (runId: string) => {
    setIsLoading(true);
    try {
      // [REAL] 실제 GitHub API 호출
      // 1. Run 상세 정보 가져오기
      const details = await getRunDetails(runId);
      setRunDetails(details);

      // 2. Run 로그 가져오기  
      const logs = await getRunLogs(runId);
      setRunLogs(logs);

      // 3. 실패한 경우 LLM 분석 요청
      if (details.conclusion === 'failure') {
        console.log(`실패한 실행 발견 (ID: ${runId}). LLM 분석을 요청합니다.`);
        analyzeRun(runId);
      }
    } catch (error) {
      console.error('Run 데이터 로드 실패:', error);
      // [FALLBACK] 에러 발생 시 기본 정보라도 표시
      const fallbackDetails: RunDetails = {
        id: runId,
        status: 'unknown',
        conclusion: null,
        timestamp: 'Unknown',
        reason: 'Failed to load data',
        branch: 'Unknown',
        workflow: 'Unknown',
        runNumber: 0,
        duration: 'Unknown',
        commit: 'Unknown',
        author: 'Unknown',
        jobs: []
      };
      setRunDetails(fallbackDetails);
      setRunLogs('로그를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLatestRunFromAllActions = async () => {
    setIsLoading(true);
    try {
      // 모든 actions 중 가장 최근 run 정보 가져오기
      const latestRun = await getLatestRunFromAllActions();
      if (latestRun) {
        // 가장 최근 run의 ID로 상세 정보 로드
        await loadRunData(latestRun.id);
      } else {
        console.log('가장 최근 run이 없습니다.');
        setRunDetails(null);
        setRunLogs('실행 기록이 없습니다.');
      }
    } catch (error) {
      console.error('최근 run 로드 실패:', error);
      setRunDetails(null);
      setRunLogs('최근 실행 기록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!actionId) {
    return (
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="dashboard-main">
          <div className="main-header">
            <h1 className="main-title">Run Log</h1>
          </div>
          <div className="dashboard-content">
            <div className="dashboard-empty-state">
              <p className="text-muted">액션을 선택해주세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="dashboard-main">
          <div className="main-header">
            <h1 className="main-title">Run Log</h1>
          </div>
          <div className="dashboard-content">
            <div className="dashboard-loading">
              <p className="text-muted">데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central Dashboard Section */}
      <div className="dashboard-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">
            Run Log {runDetails ? `#${runDetails.id}` : '(최근 실행)'}
          </h1>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Panel Selection */}
          <div className="panel-selector">
            <button
              className={`panel-btn ${selectedPanel === 1 ? 'active' : ''}`}
              onClick={() => setSelectedPanel(1)}
            >
              Run Info
            </button>
            <button
              className={`panel-btn ${selectedPanel === 2 ? 'active' : ''}`}
              onClick={() => setSelectedPanel(2)}
            >
              Run Log
            </button>
            <button
              className={`panel-btn ${selectedPanel === 3 ? 'active' : ''}`}
              onClick={() => setSelectedPanel(3)}
            >
              Jobs
            </button>
            <button
              className={`panel-btn ${selectedPanel === 4 ? 'active' : ''}`}
              onClick={() => setSelectedPanel(4)}
            >
              Artifacts
            </button>
          </div>

          {/* Panel Content */}
          <div className="panel-content">
            {selectedPanel === 1 && runDetails && (
              <div className="panel-section panel-container">
                <h2 className="dashboard-section-title">Run Information</h2>
                <div className="run-info-card">
                  <div className="run-info-row">
                    <span className="run-info-label">Run ID:</span>
                    <span className="run-info-value">{runDetails.id}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Status:</span>
                    <span className={`run-info-value status-${runDetails.conclusion || runDetails.status}`}>
                      {runDetails.conclusion || runDetails.status}
                    </span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Timestamp:</span>
                    <span className="run-info-value">{runDetails.timestamp}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Branch:</span>
                    <span className="run-info-value">{runDetails.branch}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Workflow:</span>
                    <span className="run-info-value">{runDetails.workflow}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Run Number:</span>
                    <span className="run-info-value">{runDetails.runNumber}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Duration:</span>
                    <span className="run-info-value">{runDetails.duration}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Commit:</span>
                    <span className="run-info-value">{runDetails.commit}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Author:</span>
                    <span className="run-info-value">{runDetails.author}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedPanel === 2 && (
              <div className="panel-section panel-container">
                <h2 className="dashboard-section-title">Detailed Log</h2>
                <div className="log-viewer">
                  <div className="log-header">
                    <span className="log-title">build.log</span>
                    <div className="log-actions">
                      <button className="log-btn log-btn-copy">Copy</button>
                    </div>
                  </div>
                  <div className="log-content">
                    <div className="log-code-container">
                      {runLogs ? (
                        runLogs.split('\n').map((line, index) => {
                          const lineNumber = index + 1;
                          return (
                            <div key={index} className="log-line">
                              <span className="line-number">{lineNumber}</span>
                              <span className="line-content">{line}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="log-empty">
                          <p>로그를 불러올 수 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedPanel === 3 && runDetails?.jobs && (
              <div className="panel-section panel-container">
                <h2 className="dashboard-section-title">Jobs</h2>
                <div className="jobs-list">
                  {runDetails.jobs.map((job: any, index: number) => (
                    <div key={index} className="job-item">
                      <div className="job-header">
                        <span className="job-name">{job.name}</span>
                        <span className={`job-status status-${job.conclusion || job.status}`}>
                          {job.conclusion || job.status}
                        </span>
                      </div>
                      <div className="job-details">
                        <span>Started: {new Date(job.started_at).toLocaleString()}</span>
                        <span>Duration: {job.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPanel === 4 && (
              <div className="panel-section panel-container">
                <h2 className="dashboard-section-title">Artifacts</h2>
                <div className="artifacts-placeholder">
                  <p>아티팩트 정보가 여기에 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right LLM Analysis Panel */}
      <div className="llm-analysis-container">
        <div className="llm-analysis-header">
          <span className="llm-analysis-title">LLM Analysis</span>
          <div className="llm-analysis-actions">
            <button className="llm-btn llm-btn-refresh">Refresh</button>
            <button className="llm-btn llm-btn-export">Export</button>
          </div>
        </div>
        <div className="llm-analysis-content">
          {llmAnalysisResult ? (
            <div className="llm-analysis-result">
              {/* 1. 헤더 및 요약 (Immediate Insight) */}
              <div className="llm-section llm-summary-section">
                <h2 className="llm-summary-title">{llmAnalysisResult.summary}</h2>
                
                <div className="llm-metadata">
                  {llmAnalysisResult.failureType && (
                    <span className={`llm-badge llm-badge-${llmAnalysisResult.failureType.toLowerCase()}`}>
                      {llmAnalysisResult.failureType.toUpperCase()}
                    </span>
                  )}
                  {llmAnalysisResult.confidence !== undefined && (
                    <span className="llm-confidence">
                      신뢰도: {Math.round(llmAnalysisResult.confidence * 100)}%
                    </span>
                  )}
                </div>

                {llmAnalysisResult.affectedStep && (
                  <div className="llm-info-item">
                    <span className="llm-info-label">영향받은 단계:</span>
                    <span className="llm-info-value">{llmAnalysisResult.affectedStep}</span>
                  </div>
                )}
                
                {llmAnalysisResult.filename && (
                  <div className="llm-info-item">
                    <span className="llm-info-label">로그 파일:</span>
                    <span className="llm-info-value">{llmAnalysisResult.filename}</span>
                  </div>
                )}
              </div>

              {/* 2. 핵심 문제 (Root Cause) */}
              <div className="llm-section llm-rootcause-section">
                <h3 className="llm-section-title">
                  <span className="llm-icon">🚨</span>
                  핵심 실패 원인
                </h3>
                <div className="llm-content-box llm-rootcause-box">
                  <p className="llm-rootcause-text">{llmAnalysisResult.rootCause}</p>
                </div>
              </div>

              {/* 3. 권장 해결책 (Suggestion) */}
              <div className="llm-section llm-suggestion-section">
                <h3 className="llm-section-title">
                  <span className="llm-icon">🛠️</span>
                  권장 조치 및 해결 방법
                </h3>
                <div className="llm-content-box llm-suggestion-box">
                  <div className="llm-suggestion-text">
                    {llmAnalysisResult.suggestion.split('\n').map((line: string, index: number) => {
                      if (line.trim().match(/^\d+\./)) {
                        return <p key={index} className="llm-suggestion-step">{line}</p>;
                      } else if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={index} className="llm-suggestion-item">{line.substring(2)}</li>;
                      } else if (line.trim()) {
                        return <p key={index} className="llm-suggestion-para">{line}</p>;
                      }
                      return null;
                    })}
                  </div>
                  <button 
                    className="llm-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(llmAnalysisResult.suggestion);
                      // TODO: 복사 완료 피드백 추가
                    }}
                  >
                    📋 복사
                  </button>
                </div>
              </div>

              {/* 4. 상세 로그 분석 (Key Errors) */}
              {llmAnalysisResult.keyErrors && llmAnalysisResult.keyErrors.length > 0 && (
                <div className="llm-section llm-errors-section">
                  <button 
                    className="llm-accordion-header"
                    onClick={() => setIsErrorDetailsOpen(!isErrorDetailsOpen)}
                  >
                    <h3 className="llm-section-title">
                      <span className="llm-icon">🧩</span>
                      오류 로그 상세 정보
                    </h3>
                    <span className={`llm-accordion-arrow ${isErrorDetailsOpen ? 'open' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {isErrorDetailsOpen && (
                    <div className="llm-errors-content">
                      {llmAnalysisResult.keyErrors.map((error, index) => (
                        <div key={index} className="llm-error-item">
                          {error.line !== undefined && (
                            <div className="llm-error-line">
                              <span className="llm-error-label">Line:</span>
                              <span className="llm-error-value">{error.line}</span>
                            </div>
                          )}
                          {error.snippet && (
                            <div className="llm-error-snippet">
                              <code>{error.snippet}</code>
                            </div>
                          )}
                          {error.note && (
                            <div className="llm-error-note">
                              <p>{error.note}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="llm-analysis-empty">
              <p className="llm-empty-text">LLM 분석 결과를 기다리는 중입니다...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
