import React from 'react';
import { WorkflowRun } from '@/types/api';
import './HistoryTable.css';

interface HistoryTableProps {
  runs: WorkflowRun[];
}

const HistoryTable: React.FC<HistoryTableProps> = ({ runs }) => {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'running':
        return 'status-running';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="history-table-container">
      <table className="table history-table">
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Status</th>
            <th>Timestamp</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className={`history-table-row ${getStatusClass(run.status)}`}>
              <td className="run-id">{run.id}</td>
              <td className="run-status">
                <span className={`status ${getStatusClass(run.status)}`}>
                  {formatStatus(run.status)}
                </span>
              </td>
              <td className="run-timestamp">{formatTimestamp(run.timestamp)}</td>
              <td className="run-reason">
                <div className="reason-container">
                  <span className="reason-text">{run.reason}</span>
                  {run.branch && (
                    <span className="branch-tag">{run.branch}</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {runs.length === 0 && (
        <div className="empty-state">
          <p className="text-muted">실행 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;