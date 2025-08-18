"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./HistoryTable.css");
// Sidebar와 동일한 StatusIndicator 컴포넌트
const StatusIndicator = ({ status, conclusion }) => {
    if (conclusion === 'failure') {
        return (<div className="status-indicator status-failed">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="#FF0000" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>);
    }
    if (conclusion === 'success') {
        return (<div className="status-indicator status-success">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 6L5.5 8.5L9 3" stroke="#238636" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>);
    }
    if (status === 'in_progress') {
        return (<div className="status-indicator status-running">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3" cy="7" r="2" fill="#FF8800" opacity="0.3"/>
          <circle cx="7" cy="7" r="2" fill="#FF8800" opacity="0.6"/>
          <circle cx="11" cy="7" r="2" fill="#FF8800" opacity="1"/>
        </svg>
      </div>);
    }
    // pending 상태
    return (<div className="status-indicator status-pending">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
        <path d="M6 2V6L8.5 8.5" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>);
};
const HistoryTable = ({ runs }) => {
    const getStatusClass = (status, conclusion) => {
        if (conclusion === 'success') {
            return 'status-success';
        }
        if (conclusion === 'failure') {
            return 'status-failed';
        }
        if (status === 'in_progress') {
            return 'status-running';
        }
        if (status === 'queued' || status === 'waiting') {
            return 'status-pending';
        }
        if (conclusion === 'cancelled' || conclusion === 'skipped') {
            return 'status-cancelled';
        }
        return 'status-pending';
    };
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    const formatStatus = (status, conclusion) => {
        if (conclusion === 'success') {
            return 'Completed';
        }
        if (conclusion === 'failure') {
            return 'Failed';
        }
        if (status === 'in_progress') {
            return 'Running';
        }
        if (status === 'queued' || status === 'waiting') {
            return 'Pending';
        }
        if (conclusion === 'cancelled' || conclusion === 'skipped') {
            return 'Cancelled';
        }
        return 'Unknown';
    };
    // timestamp 순서대로 정렬 (최신이 위로)
    const sortedRuns = [...runs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return (<div className="history-table-wrapper">
      {/* Table Header */}
      <div className="runs-header">
        <div className="header-id">ID</div>
        <div className="header-status">Status</div>
        <div className="header-timestamp">Timestamp</div>
        <div className="header-branch">Branch</div>
        <div className="header-reason">Reason</div>
      </div>
      
      {/* Runs List */}
      {sortedRuns.length > 0 ? (<div className="runs-list">
          {sortedRuns.map((run) => (<div key={run.id} className={`run-item ${getStatusClass(run.status, run.conclusion)}`}>
              <div className="run-row">
                <div className="run-id">#{run.id}</div>
                <div className="run-status">
                  <StatusIndicator status={run.status} conclusion={run.conclusion}/>
                  <span className="status-text">{formatStatus(run.status, run.conclusion)}</span>
                </div>
                <div className="run-timestamp">{formatTimestamp(run.timestamp)}</div>
                <div className="run-branch">
                  {run.branch ? (<span className="branch-tag">{run.branch}</span>) : (<span className="no-branch">-</span>)}
                </div>
                <div className="run-reason">
                  {run.reason || '-'}
                </div>
              </div>
            </div>))}
        </div>) : (<div className="empty-state">
          <p className="text-muted">실행 기록이 없습니다.</p>
        </div>)}
    </div>);
};
exports.default = HistoryTable;
