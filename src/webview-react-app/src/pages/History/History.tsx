import React, { useState, useEffect } from 'react';
import HistoryTable from '@/components/HistoryTable/HistoryTable';
import { WorkflowRun } from '@/types/api';
import { getRunHistory } from '@/api/github';
import './History.css';

interface HistoryPageProps {
  actionId: string | null;
  isSidebarOpen: boolean;
  onRunClick: (runId: string) => void; // [ADD] 실행(run) 클릭 시 호출될 함수
}

// Mock runs data - in real app, this would be fetched based on actionId
const mockRuns: WorkflowRun[] = [
  {
    id: '1234',
    status: 'completed',
    conclusion: 'success',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Build completed successfully',
    branch: 'main',
  },
  {
    id: '1235',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 11:45:22',
    reason: 'Compile Error: Syntax error in line 45',
    branch: 'develop',
  },
  {
    id: '1236',
    status: 'completed',
    conclusion: 'success',
    timestamp: '2025-08-15 11:30:15',
    reason: 'All tests passed',
    branch: 'feature/new-ui',
  },
  {
    id: '1237',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 11:15:08',
    reason: 'Test failure: 3 tests failed',
    branch: 'main',
  },
  {
    id: '1238',
    status: 'completed',
    conclusion: 'success',
    timestamp: '2025-08-15 11:00:42',
    reason: 'Deployment successful',
    branch: 'staging',
  },
  {
    id: '1239',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 10:45:33',
    reason: 'Dependency resolution failed',
    branch: 'develop',
  },
  {
    id: '1240',
    status: 'completed',
    conclusion: 'success',
    timestamp: '2025-08-15 10:30:18',
    reason: 'Code quality checks passed',
    branch: 'main',
  },
  {
    id: '1241',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 10:15:55',
    reason: 'Build timeout after 30 minutes',
    branch: 'feature/performance',
  },
];

const HistoryPage: React.FC<HistoryPageProps> = ({ actionId, isSidebarOpen, onRunClick }) => { // [MOD] onRunClick prop 추가
  const [runHistory, setRunHistory] = useState(mockRuns);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // API를 통해 실제 run history를 가져옴
    if (actionId) {
      setIsLoading(true);
      getRunHistory(actionId)
        .then(runs => {
          setRunHistory(runs);
        })
        .catch(error => {
          console.error('Failed to fetch run history:', error);
          // 에러 발생 시 mock 데이터 사용
          setRunHistory(mockRuns);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [actionId]);

  if (!actionId) {
    return (
      <div className={`history-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="history-main">
          <div className="main-header">
            <h1 className="main-title">Workflow Run History</h1>
          </div>
          <div className="history-editor">
            <div className="history-empty-state">
              <p className="text-muted">워크플로우를 선택해주세요.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`history-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central History Section */}
      <div className="history-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">Workflow Run History</h1>
        </div>

        {/* History Editor */}
        <div className="history-editor">
          {isLoading ? (
            <div className="history-loading">
              <p className="text-muted">로딩 중...</p>
            </div>
          ) : (
            <HistoryTable runs={runHistory} isSidebarOpen={isSidebarOpen} onRunClick={onRunClick} />)}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
