import React, { useState, useEffect } from "react";
import HistoryTable from "../../components/HistoryTable/HistoryTable";
import "./History.css";

interface HistoryPageProps {
  actionId: string | null;
}

// TODO: Remove mock data
const mockRuns = [
  {
    id: "1",
    event: "push",
    status: "failed" as const,
    branch: "main",
    startedAt: new Date("2025-08-15T12:00:34Z"),
    duration: 120000, // 2 minutes in milliseconds
  },
  {
    id: "2",
    event: "pull_request",
    status: "failed" as const,
    branch: "feature/new-feature",
    startedAt: new Date("2025-08-15T11:30:00Z"),
    duration: 90000,
  },
  {
    id: "3",
    event: "push",
    status: "success" as const,
    branch: "main",
    startedAt: new Date("2025-08-15T10:15:00Z"),
    duration: 180000,
  },
  {
    id: "4",
    event: "push",
    status: "running" as const,
    branch: "develop",
    startedAt: new Date("2025-08-15T12:30:00Z"),
    duration: 45000,
  },
  {
    id: "5",
    event: "pull_request",
    status: "failed" as const,
    branch: "bugfix/issue-123",
    startedAt: new Date("2025-08-15T09:45:00Z"),
    duration: 95000,
  },
  {
    id: "6",
    event: "push",
    status: "success" as const,
    branch: "main",
    startedAt: new Date("2025-08-15T08:20:00Z"),
    duration: 150000,
  },
  {
    id: "7",
    event: "push",
    status: "failed" as const,
    branch: "feature/auth",
    startedAt: new Date("2025-08-15T07:10:00Z"),
    duration: 80000,
  },
  {
    id: "8",
    event: "pull_request",
    status: "success" as const,
    branch: "main",
    startedAt: new Date("2025-08-15T06:00:00Z"),
    duration: 200000,
  },
];

const HistoryPage: React.FC<HistoryPageProps> = ({ actionId }) => {
  const [runs, setRuns] = useState(mockRuns);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In a real app, fetch run history when actionId changes
    if (actionId) {
      setIsLoading(true);
      // TODO: Call api/github.ts getRunHistory(actionId)
      // For now, just use mock data
      setTimeout(() => {
        setRuns(mockRuns);
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
        <HistoryTable runs={runs} />
      )}
    </div>
  );
};

export default HistoryPage;
