import React, { useState, useEffect } from 'react';
import HistoryTable from '@/components/HistoryTable/HistoryTable';
import { WorkflowRun } from '@/types/api';
import './History.css';

interface HistoryPageProps {
  actionId: string | null;
}

// Mock runs data - in real app, this would be fetched based on actionId
const mockRuns: WorkflowRun[] = [
  {
    id: '1234',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
    branch: 'main',
  },
  {
    id: '1235',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1236',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1237',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1238',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1239',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1240',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
  {
    id: '1241',
    status: 'completed',
    conclusion: 'failure',
    timestamp: '2025-08-15 12:00:34',
    reason: 'Compile Error',
  },
];

const HistoryPage: React.FC<HistoryPageProps> = ({ actionId }) => {
  const [runHistory, setRunHistory] = useState(mockRuns);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In a real app, fetch run history when actionId changes
    if (actionId) {
      setIsLoading(true);
      // TODO: Call api/github.ts getRunHistory(actionId)
      // For now, just use mock data
      setTimeout(() => {
        setRunHistory(mockRuns);
        setIsLoading(false);
      }, 100);
    }
  }, [actionId]);

  if (!actionId) {
    return (
      <div className="history-main-content">
        <div className="history-empty-state">
          <p className="text-muted">워크플로우를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-main-content">
      <h1 className="history-title">Workflow Run History</h1>
      {isLoading ? (
        <div className="history-loading">
          <p className="text-muted">로딩 중...</p>
        </div>
      ) : (
        <HistoryTable runs={runHistory} />
      )}
    </div>
  );
};

export default HistoryPage;
