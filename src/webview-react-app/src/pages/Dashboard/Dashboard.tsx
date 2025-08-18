import React, { useState } from 'react';
import './Dashboard.css';

interface DashboardPageProps {
  actionId: string | null;
  isSidebarOpen: boolean;
}

// Mock data for dashboard
const mockRunInfo = {
  id: '1234',
  status: 'completed',
  conclusion: 'success',
  timestamp: '2025-08-15 12:00:34',
  reason: 'Build completed successfully',
  branch: 'main',
  workflow: 'CI/CD Workflow',
  runNumber: 42,
  duration: '5m 23s',
  commit: 'a1b2c3d4e5f6',
  author: 'sungwoncho'
};

const mockDetailedLog = `2025-08-15T12:00:34.123Z [INFO] Starting workflow run
2025-08-15T12:00:35.456Z [INFO] Triggered by push to main branch
2025-08-15T12:00:36.789Z [INFO] Setting up job: build
2025-08-15T12:00:37.012Z [INFO] Running on runner: ubuntu-latest
2025-08-15T12:00:38.345Z [INFO] Checking out code...
2025-08-15T12:00:39.678Z [INFO] Code checkout completed
2025-08-15T12:00:40.901Z [INFO] Setting up Node.js environment
2025-08-15T12:00:41.234Z [INFO] Node.js version: 20.x
2025-08-15T12:00:42.567Z [INFO] Installing dependencies...
2025-08-15T12:00:43.890Z [INFO] npm ci --prefer-offline --no-audit
2025-08-15T12:00:45.123Z [INFO] Dependencies installed successfully
2025-08-15T12:00:46.456Z [INFO] Running linting checks...
2025-08-15T12:00:47.789Z [INFO] ESLint: No issues found
2025-08-15T12:00:48.012Z [INFO] Running tests...
2025-08-15T12:00:49.345Z [INFO] Test suite completed: 127 tests passed
2025-08-15T12:00:50.678Z [INFO] Building application...
2025-08-15T12:00:51.901Z [INFO] Build completed successfully
2025-08-15T12:00:52.234Z [INFO] Uploading build artifacts...
2025-08-15T12:00:53.567Z [INFO] Artifacts uploaded successfully
2025-08-15T12:00:54.890Z [INFO] Workflow completed successfully`;

const mockLLMAnalysis = `## Build Analysis Summary

### ✅ Build Status: SUCCESS
The workflow completed successfully with all jobs passing.

### 🔍 Key Findings
1. **Dependencies**: All npm packages resolved successfully
2. **Code Quality**: ESLint passed with no issues
3. **Testing**: 127 tests passed (100% success rate)
4. **Build Process**: Application compiled without errors
5. **Artifacts**: Build artifacts generated and uploaded successfully

### 📊 Performance Metrics
- **Total Duration**: 5m 23s
- **Dependency Installation**: ~2.5s
- **Linting**: ~1.2s
- **Testing**: ~1.8s
- **Build**: ~1.5s

### 🎯 Recommendations
- Build time is within acceptable range
- Consider caching dependencies for faster builds
- Test coverage is excellent
- No security vulnerabilities detected

### 🔗 Related Logs
The analysis is based on detailed logs from lines 1-25, showing successful execution of all workflow steps.`;

const DashboardPage: React.FC<DashboardPageProps> = ({ actionId, isSidebarOpen }) => {
  const [selectedPanel, setSelectedPanel] = useState<number>(1);

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

  return (
    <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central Dashboard Section */}
      <div className="dashboard-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">Run Log</h1>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Panel Selection */}
          <div className="panel-selector">
            {[1, 2, 3, 4].map((panelNum) => (
              <button
                key={panelNum}
                className={`panel-btn ${selectedPanel === panelNum ? 'active' : ''}`}
                onClick={() => setSelectedPanel(panelNum)}
              >
                Panel {panelNum}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="panel-content">
            {selectedPanel === 1 && (
              <div className="panel-section">
                <h2 className="section-title">Run Information</h2>
                <div className="run-info-card">
                  <div className="run-info-row">
                    <span className="run-info-label">Run ID:</span>
                    <span className="run-info-value">{mockRunInfo.id}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Status:</span>
                    <span className={`run-info-value status-${mockRunInfo.conclusion}`}>
                      {mockRunInfo.conclusion}
                    </span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Timestamp:</span>
                    <span className="run-info-value">{mockRunInfo.timestamp}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Branch:</span>
                    <span className="run-info-value">{mockRunInfo.branch}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Workflow:</span>
                    <span className="run-info-value">{mockRunInfo.workflow}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Run Number:</span>
                    <span className="run-info-value">{mockRunInfo.runNumber}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Duration:</span>
                    <span className="run-info-value">{mockRunInfo.duration}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Commit:</span>
                    <span className="run-info-value">{mockRunInfo.commit}</span>
                  </div>
                  <div className="run-info-row">
                    <span className="run-info-label">Author:</span>
                    <span className="run-info-value">{mockRunInfo.author}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedPanel === 2 && (
              <div className="panel-section">
                <h2 className="section-title">Detailed Log</h2>
                <div className="log-viewer">
                  <div className="log-header">
                    <span className="log-title">build.log</span>
                    <div className="log-actions">
                      <button className="log-btn log-btn-copy">Copy</button>
                      <button className="log-btn log-btn-search">Search</button>
                    </div>
                  </div>
                  <div className="log-content">
                    <div className="log-code-container">
                      {mockDetailedLog.split('\n').map((line, index) => {
                        const lineNumber = index + 1;
                        return (
                          <div key={index} className="log-line">
                            <span className="line-number">{lineNumber}</span>
                            <span className="line-content">{line}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedPanel === 3 && (
              <div className="panel-section">
                <h2 className="section-title">Panel 3</h2>
                <div className="panel-placeholder">
                  <p>Panel 3 content goes here</p>
                </div>
              </div>
            )}

            {selectedPanel === 4 && (
              <div className="panel-section">
                <h2 className="section-title">Panel 4</h2>
                <div className="panel-placeholder">
                  <p>Panel 4 content goes here</p>
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
          <div className="llm-analysis-text">
            {mockLLMAnalysis.split('\n').map((line, index) => {
              if (line.startsWith('## ')) {
                return <h2 key={index} className="llm-h2">{line.substring(3)}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index} className="llm-h3">{line.substring(4)}</h3>;
              } else if (line.startsWith('- ')) {
                return <li key={index} className="llm-li">{line.substring(2)}</li>;
              } else if (line.startsWith('1. ')) {
                return <li key={index} className="llm-li">{line.substring(3)}</li>;
              } else if (line.trim() === '') {
                return <br key={index} />;
              } else {
                return <p key={index} className="llm-p">{line}</p>;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
