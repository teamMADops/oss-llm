/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import './RunLog.css';
import { LLMResult, PinpointResult, SuspectedPath } from '../../../../llm/types/types';
import { getRunDetails, getRunLogs, analyzeRun, getLatestRunFromAllActions } from '@/api/github';
import { analyzePinpoint } from '@/api/llm';

interface RunLogPageProps {
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

const RunLogPage: React.FC<RunLogPageProps> = ({ actionId, runId, isSidebarOpen, llmAnalysisResult }) => {
  const [selectedPanel, setSelectedPanel] = useState<number>(1);
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null);
  const [runLogs, setRunLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isErrorDetailsOpen, setIsErrorDetailsOpen] = useState(false);
  const [isSuspectedPathsOpen, setIsSuspectedPathsOpen] = useState(false);
  const [selectedSuspectedPath, setSelectedSuspectedPath] = useState<SuspectedPath | null>(null);
  const [pinpointResult, setPinpointResult] = useState<PinpointResult | null>(null);
  const [isPinpointLoading, setIsPinpointLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [logCopyStatus, setLogCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');

  // 2차 분석 결과 및 LLM 분석 결과 메시지 수신
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'secondPassResult') {
        console.log('2차 분석 결과 수신:', message.payload);
        setPinpointResult(message.payload);
        setIsPinpointLoading(false);
      } else if (message.command === 'llmAnalysisResult') {
        console.log('LLM 분석 결과 수신 (Refresh 완료)');
        setIsRefreshing(false);
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

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

      // 3. 성공하지 않은 경우 LLM 분석 요청
      if (details.conclusion !== 'success' && details.conclusion !== null) {
        console.log(`실패한 실행 발견 (ID: ${runId}, conclusion: ${details.conclusion}). LLM 분석을 요청합니다.`);
        analyzeRun(runId);
      } else {
        console.log(`Run #${runId} - conclusion: ${details.conclusion}, LLM 분석 건너뜀`);
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
      setRunLogs('Unable to load logs.');
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
        setRunLogs('No execution history available.');
      }
    } catch (error) {
      console.error('최근 run 로드 실패:', error);
      setRunDetails(null);
      setRunLogs('Unable to load recent execution history.');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh 기능: 현재 Run의 로그를 다시 가져와 LLM 분석 재실행
  const handleRefresh = async () => {
    if (!runDetails?.id) {
      console.warn('Refresh: runDetails.id가 없습니다.');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log(`Refresh 시작: Run ID ${runDetails.id}`);
      
      // 1. 로그 다시 가져오기
      const logs = await getRunLogs(runDetails.id);
      setRunLogs(logs);
      
      // 2. LLM 분석 재실행 (실패한 경우에만)
      if (runDetails.conclusion !== 'success' && runDetails.conclusion !== null) {
        console.log(`LLM 분석 재실행: Run ID ${runDetails.id}`);
        analyzeRun(runDetails.id);
        // isRefreshing은 LLM 분석 결과를 받을 때 (llmAnalysisResult 메시지) false로 설정됨
      } else {
        // 성공한 Run은 LLM 분석이 필요 없으므로 바로 로딩 종료
        setIsRefreshing(false);
      }
      
      console.log('Refresh 완료 (LLM 분석 대기 중)');
    } catch (error) {
      console.error('Refresh 실패:', error);
      setIsRefreshing(false); // 에러 시에는 바로 로딩 종료
    }
  };

  // Export 기능: LLM 분석 결과를 클립보드로 복사
  const handleExport = async () => {
    if (!llmAnalysisResult) {
      console.warn('Export: LLM 분석 결과가 없습니다.');
      return;
    }

    setExportStatus('copying');
    try {
      // LLM 분석 결과를 텍스트 형태로 변환
      let exportText = '';
      
      if (llmAnalysisResult.summary === "성공한 작업입니다!") {
        exportText = `=== LLM Analysis Result ===
Status: Success
Description: This workflow has been completed successfully.`;
      } else if (llmAnalysisResult.summary === "분석이 실패했습니다") {
        exportText = `=== LLM Analysis Result ===
Status: Analysis Failed
Description: An error occurred during LLM analysis.`;
        if ((llmAnalysisResult as any).error) {
          exportText += `\nError: ${(llmAnalysisResult as any).error}`;
        }
      } else {
        // 실패 분석 결과
        exportText = `=== LLM Analysis Result ===
Summary: ${llmAnalysisResult.summary}
Failure Type: ${llmAnalysisResult.failureType || 'N/A'}
Confidence: ${llmAnalysisResult.confidence ? Math.round(llmAnalysisResult.confidence * 100) + '%' : 'N/A'}
Affected Step: ${llmAnalysisResult.affectedStep || 'N/A'}

=== Root Cause ===
${llmAnalysisResult.rootCause}

=== Recommended Actions ===
${llmAnalysisResult.suggestion}`;

        if (llmAnalysisResult.keyErrors && llmAnalysisResult.keyErrors.length > 0) {
          exportText += '\n\n=== Error Log Details ===';
          llmAnalysisResult.keyErrors.forEach((error, index) => {
            exportText += `\n\n[Error ${index + 1}]`;
            if (error.line !== undefined) {
              exportText += `\nLine: ${error.line}`;
            }
            if (error.snippet) {
              exportText += `\nSnippet: ${error.snippet}`;
            }
            if (error.note) {
              exportText += `\nNote: ${error.note}`;
            }
          });
        }
      }

      // 클립보드에 복사
      await navigator.clipboard.writeText(exportText);
      setExportStatus('success');
      console.log('LLM 분석 결과가 클립보드에 복사되었습니다.');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Export 실패:', error);
      setExportStatus('error');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
    }
  };

  // Log Copy 기능: 상세 로그를 클립보드로 복사
  const handleLogCopy = async () => {
    if (!runLogs) {
      console.warn('Log Copy: 로그 내용이 없습니다.');
      return;
    }

    setLogCopyStatus('copying');
    try {
      // 로그 내용을 클립보드에 복사
      await navigator.clipboard.writeText(runLogs);
      setLogCopyStatus('success');
      console.log('로그 내용이 클립보드에 복사되었습니다.');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setLogCopyStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Log Copy 실패:', error);
      setLogCopyStatus('error');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setLogCopyStatus('idle');
      }, 3000);
    }
  };

  if (!actionId) {
    return (
      <div className={`runLog-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="runLog-main">
          <div className="main-header">
            <h1 className="main-title">Run Log</h1>
          </div>
          <div className="runLog-content">
            <div className="llm-analysis-empty">
              <p className="llm-empty-text">Please select an action.</p>
            </div>
          </div>
        </div>
        {/* Right LLM Analysis Panel */}
        <div className="llm-analysis-container">
          <div className="llm-analysis-header">
            <span className="llm-analysis-title">LLM Analysis</span>
          </div>
          <div className="llm-analysis-content">
            <div className="llm-analysis-empty">
              <p className="llm-empty-text">Please select a workflow.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`runLog-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="runLog-main">
          <div className="main-header">
            <h1 className="main-title">Run Log</h1>
          </div>
          <div className="runLog-content">
            <div className="llm-analysis-empty">
              <div className="llm-loading-spinner"></div>
              <p className="llm-empty-text">Loading data...</p>
            </div>
          </div>
        </div>
        {/* Right LLM Analysis Panel */}
        <div className="llm-analysis-container">
          <div className="llm-analysis-header">
            <span className="llm-analysis-title">LLM Analysis</span>
          </div>
          <div className="llm-analysis-content">
            <div className="llm-analysis-empty">
              <div className="llm-loading-spinner"></div>
              <p className="llm-empty-text">Loading data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`runLog-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central Dashboard Section */}
      <div className="runLog-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">
            Run Log {runDetails ? `#${runDetails.id}` : '(Latest Run)'}
          </h1>
        </div>

        {/* Dashboard Content */}
        <div className="runLog-content">
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
                <h2 className="runLog-section-title">Run Information</h2>
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
                <h2 className="runLog-section-title">Detailed Log</h2>
                <div className="log-viewer">
                  <div className="log-header">
                    <span className="log-title">build.log</span>
                    <div className="log-actions">
                      <button 
                        className={`log-btn log-btn-copy ${logCopyStatus !== 'idle' ? logCopyStatus : ''}`}
                        onClick={handleLogCopy}
                        disabled={!runLogs || logCopyStatus === 'copying'}
                        title="Copy log content to clipboard"
                      >
                        {logCopyStatus === 'copying' ? 'Copying...' : 
                         logCopyStatus === 'success' ? 'Copied!' : 
                         logCopyStatus === 'error' ? 'Copy failed' : 'Copy'}
                      </button>
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
                          <p>Unable to load logs.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedPanel === 3 && runDetails?.jobs && (
              <div className="panel-section panel-container">
                <h2 className="runLog-section-title">Jobs</h2>
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
                <h2 className="runLog-section-title">Artifacts</h2>
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
            <button 
              className={`llm-btn llm-btn-refresh ${isRefreshing ? 'loading' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing || !runDetails?.id}
              title="Refresh logs and re-run LLM analysis"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              className={`llm-btn llm-btn-export ${exportStatus !== 'idle' ? exportStatus : ''}`}
              onClick={handleExport}
              disabled={!llmAnalysisResult || exportStatus === 'copying'}
              title="Copy LLM analysis result to clipboard"
            >
              {exportStatus === 'copying' ? 'Copying...' : 
               exportStatus === 'success' ? 'Copied!' : 
               exportStatus === 'error' ? 'Copy failed' : 'Export'}
            </button>
          </div>
        </div>
        <div className="llm-analysis-content">
          {isRefreshing ? (
            // Refresh 로딩 중
            <div className="llm-analysis-empty">
              <div className="llm-loading-spinner"></div>
              <p className="llm-empty-text">Re-running LLM analysis...</p>
            </div>
          ) : llmAnalysisResult ? (
            llmAnalysisResult.summary === "성공한 작업입니다!" ? (
              // [ADD] 성공 상태 UI - 섹션 형태로 통일
              <div className="llm-analysis-result">
                <div className="llm-section llm-success-section">
                  <div className="llm-status-header">
                    <span className="llm-status-icon">✅</span>
                    <h2 className="llm-status-title">Successful Execution!</h2>
                  </div>
                  <div className="llm-status-content">
                    <p className="llm-status-message">
                      This workflow has been completed successfully. 
                      No further analysis is required.
                    </p>
                  </div>
                </div>
              </div>
            ) : llmAnalysisResult.summary === "분석이 실패했습니다" ? (
              // [ADD] 에러 상태 UI - 섹션 형태로 통일
              <div className="llm-analysis-result">
                <div className="llm-section llm-error-section">
                  <div className="llm-status-header">
                    <span className="llm-status-icon">❌</span>
                    <h2 className="llm-status-title">Analysis Failed</h2>
                  </div>
                  <div className="llm-status-content">
                    <p className="llm-status-message">
                      An error occurred during LLM analysis.
                    </p>
                    {(llmAnalysisResult as any).error && (
                      <div className="llm-content-box llm-error-detail-box">
                        <div className="llm-error-detail-label">Error Details</div>
                        <p className="llm-error-detail-text">{(llmAnalysisResult as any).error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // 기존 failure 상태 UI
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
                      Confidence: {Math.round(llmAnalysisResult.confidence * 100)}%
                    </span>
                  )}
                </div>

                {llmAnalysisResult.affectedStep && (
                  <div className="llm-info-item">
                    <span className="llm-info-label">Affected Step:</span>
                    <span className="llm-info-value">{llmAnalysisResult.affectedStep}</span>
                  </div>
                )}
                
                {llmAnalysisResult.filename && (
                  <div className="llm-info-item">
                    <span className="llm-info-label">Log File:</span>
                    <span className="llm-info-value">{llmAnalysisResult.filename}</span>
                  </div>
                )}
              </div>

              {/* 2. 핵심 문제 (Root Cause) */}
              <div className="llm-section llm-rootcause-section">
                <h3 className="llm-section-title">
                  <span className="llm-icon">🚨</span>
                  Root Cause
                </h3>
                <div className="llm-content-box llm-rootcause-box">
                  <p className="llm-rootcause-text">{llmAnalysisResult.rootCause}</p>
                </div>
              </div>

              {/* 3. 권장 해결책 (Suggestion) */}
              <div className="llm-section llm-suggestion-section">
                <h3 className="llm-section-title">
                  <span className="llm-icon">🛠️</span>
                  Recommended Actions
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
                    {/* TODO: 여기 버튼은 복사 기능이 구현이 되어 있는것 같은데? */}
                    📋 Copy
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
                      Error Log Details
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

              {/* 5. 의심 경로 목록 (Suspected Paths) */}
              {llmAnalysisResult.suspectedPaths && llmAnalysisResult.suspectedPaths.length > 0 && (
                <div className="llm-section llm-suspected-paths-section">
                  <button 
                    className="llm-accordion-header"
                    onClick={() => setIsSuspectedPathsOpen(!isSuspectedPathsOpen)}
                  >
                    <h3 className="llm-section-title">
                      <span className="llm-icon">🔍</span>
                      Suspected Paths ({llmAnalysisResult.suspectedPaths.length})
                    </h3>
                    <span className={`llm-accordion-arrow ${isSuspectedPathsOpen ? 'open' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {isSuspectedPathsOpen && (
                    <div className="llm-suspected-paths-content">
                      {llmAnalysisResult.suspectedPaths.map((suspectedPath, index) => (
                        <div 
                          key={index} 
                          className={`llm-suspected-path-item ${selectedSuspectedPath === suspectedPath ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedSuspectedPath(suspectedPath);
                            setIsPinpointLoading(true);
                            
                            // 2차 LLM 분석 요청
                            analyzePinpoint({
                              path: suspectedPath.path,
                              lineHint: suspectedPath.lineHint,
                              logExcerpt: suspectedPath.logExcerpt || '',
                              context: {
                                workflow: runDetails?.workflow,
                                step: llmAnalysisResult.affectedStep,
                              },
                              radius: 30,
                              ref: 'main'
                            });
                            
                            console.log('2차 LLM 분석 요청 전송:', suspectedPath);
                          }}
                        >
                          <div className="llm-suspected-path-header">
                            <span className="llm-suspected-path-icon">📄</span>
                            <span className="llm-suspected-path-path">{suspectedPath.path}</span>
                            {suspectedPath.score !== undefined && (
                              <span className="llm-suspected-path-score">
                                {Math.round(suspectedPath.score * 100)}%
                              </span>
                            )}
                          </div>
                          <div className="llm-suspected-path-reason">
                            {suspectedPath.reason}
                          </div>
                          {suspectedPath.lineHint !== undefined && (
                            <div className="llm-suspected-path-line">
                              <span className="llm-suspected-path-line-label">Line:</span>
                              <span className="llm-suspected-path-line-value">{suspectedPath.lineHint}</span>
                            </div>
                          )}
                          {suspectedPath.logExcerpt && (
                            <div className="llm-suspected-path-log">
                              <div className="llm-suspected-path-log-label">Log Excerpt:</div>
                              <code className="llm-suspected-path-log-content">{suspectedPath.logExcerpt}</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. 2차 분석 결과 (Pinpoint Result) */}
              {isPinpointLoading && (
                <div className="llm-section llm-pinpoint-section">
                  <h3 className="llm-section-title">
                    <span className="llm-icon">🎯</span>
                    Analyzing in detail...
                  </h3>
                  <div className="llm-analysis-empty">
                    <div className="llm-loading-spinner"></div>
                    <p className="llm-empty-text">Analyzing the selected file in detail...</p>
                  </div>
                </div>
              )}
              
              {!isPinpointLoading && pinpointResult && (
                <div className="llm-section llm-pinpoint-section">
                  <h3 className="llm-section-title">
                    <span className="llm-icon">🎯</span>
                    Detailed Analysis
                  </h3>
                  
                  <div className="llm-pinpoint-content">
                    {/* 파일 정보 */}
                    <div className="llm-pinpoint-file">
                      <span className="llm-pinpoint-file-label">Problem File:</span>
                      <span className="llm-pinpoint-file-value">{pinpointResult.file}</span>
                    </div>

                    {/* 라인 범위 */}
                    {(pinpointResult.startLine !== undefined || pinpointResult.endLine !== undefined) && (
                      <div className="llm-pinpoint-lines">
                        <span className="llm-pinpoint-lines-label">Fix Range:</span>
                        <span className="llm-pinpoint-lines-value">
                          {pinpointResult.startLine !== undefined && pinpointResult.endLine !== undefined
                            ? `Lines ${pinpointResult.startLine} - ${pinpointResult.endLine}`
                            : pinpointResult.startLine !== undefined
                            ? `From line ${pinpointResult.startLine}`
                            : `To line ${pinpointResult.endLine}`
                          }
                        </span>
                      </div>
                    )}

                    {/* 신뢰도 */}
                    {pinpointResult.confidence !== undefined && (
                      <div className="llm-pinpoint-confidence">
                        <span className="llm-pinpoint-confidence-label">Confidence:</span>
                        <span className="llm-pinpoint-confidence-value">
                          {Math.round(pinpointResult.confidence * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Unified Diff */}
                    {pinpointResult.unifiedDiff && (
                      <div className="llm-pinpoint-diff">
                        <div className="llm-pinpoint-diff-label">Suggested Changes:</div>
                        <div className="llm-pinpoint-diff-content">
                          <pre><code>{pinpointResult.unifiedDiff}</code></pre>
                        </div>
                        <button 
                          className="llm-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(pinpointResult.unifiedDiff || '');
                            // TODO: 복사 완료 피드백 추가
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    )}

                    {/* 체크리스트 */}
                    {pinpointResult.checklist && pinpointResult.checklist.length > 0 && (
                      <div className="llm-pinpoint-checklist">
                        <div className="llm-pinpoint-checklist-label">Pre-PR Checklist:</div>
                        <ul className="llm-pinpoint-checklist-items">
                          {pinpointResult.checklist.map((item, index) => (
                            <li key={index} className="llm-pinpoint-checklist-item">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            )
          ) : runDetails && runDetails.conclusion === 'success' ? (
            // [ADD] runDetails가 success일 때 자동으로 성공 UI 표시 - 섹션 형태로 통일
            <div className="llm-analysis-result">
              <div className="llm-section llm-success-section">
                <div className="llm-status-header">
                  <span className="llm-status-icon">✅</span>
                  <h2 className="llm-status-title">Successful Execution!</h2>
                </div>
                <div className="llm-status-content">
                  <p className="llm-status-message">
                    This workflow has been completed successfully. 
                    No further analysis is required.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="llm-analysis-empty">
              <div className="llm-loading-spinner"></div>
              <p className="llm-empty-text">Waiting for LLM analysis...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunLogPage;
