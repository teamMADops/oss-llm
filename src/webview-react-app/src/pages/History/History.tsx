import React from 'react';
import HistoryTable from '@/components/HistoryTable/HistoryTable';
import { useRunHistory } from '@/hooks/useRunHistory';
import './History.css';

interface HistoryPageProps {
  actionId: string | null;
  isSidebarOpen: boolean;
  onRunClick: (runId: string) => void; // [ADD] 실행(run) 클릭 시 호출될 함수
}

const HistoryPage: React.FC<HistoryPageProps> = ({ actionId, isSidebarOpen, onRunClick }) => { // [MOD] onRunClick prop 추가
  const { runHistory, isLoading } = useRunHistory(actionId);

  if (!actionId) {
    return (
      <div className={`history-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="history-main">
          <div className="main-header">
            <h1 className="main-title">Workflow Run History</h1>
          </div>
          <div className="history-editor">
            <div className="llm-analysis-empty">
              <p className="llm-empty-text">워크플로우를 선택해주세요.</p>
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
            <div className="llm-analysis-empty">
              <div className="llm-loading-spinner"></div>
              <p className="llm-empty-text">실행 기록을 불러오는 중...</p>
            </div>
          ) : (
            <HistoryTable runs={runHistory} isSidebarOpen={isSidebarOpen} onRunClick={onRunClick} />)}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
