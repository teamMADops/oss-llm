import React, { useState } from 'react';
import { WorkflowRun } from '@/types/api';
import './HistoryTable.css';
import { StatusIndicator } from '@/components/common/StatusIndicator/StatusIndicator';

interface HistoryTableProps {
  runs: WorkflowRun[];
  isSidebarOpen: boolean;
  onRunClick: (runId: string) => void; // [ADD] 실행(run) 클릭 시 호출될 함수
}

const HistoryTable: React.FC<HistoryTableProps> = ({ runs, onRunClick }) => { // [MOD] onRunClick prop 추가
  // 필터 상태 관리
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  
  // 필터 검색 상태
  const [branchSearch, setBranchSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');

  // 다른 드롭다운 닫기 함수들
  const toggleBranchDropdown = () => {
    setShowBranchDropdown(!showBranchDropdown);
    setShowStatusDropdown(false);
    setShowAuthorDropdown(false);
  };

  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown);
    setShowBranchDropdown(false);
    setShowAuthorDropdown(false);
  };

  const toggleAuthorDropdown = () => {
    setShowAuthorDropdown(!showAuthorDropdown);
    setShowBranchDropdown(false);
    setShowStatusDropdown(false);
  };

  const getStatusClass = (status: string, conclusion: string | null) => {
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

  // 기존 formatTimestamp 함수 (필요시 사용 가능)
  // const formatTimestamp = (timestamp: string) => {
  //   const date = new Date(timestamp);
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const day = String(date.getDate()).padStart(2, '0');
  //   const hours = String(date.getHours()).padStart(2, '0');
  //   const minutes = String(date.getMinutes()).padStart(2, '0');
  //   const seconds = String(date.getSeconds()).padStart(2, '0');

  //   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  // };

  // GitHub Actions 스타일의 "몇 시간 전" 계산 함수
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  // 기존 formatStatus 함수 (필요시 사용 가능)
  // const formatStatus = (status: string, conclusion: string | null) => {
  //   if (conclusion === 'success') {
  //     return 'Completed';
  //   }
  //   if (conclusion === 'failure') {
  //     return 'Failed';
  //   }
  //   if (status === 'in_progress') {
  //     return 'Running';
  //   }
  //   if (status === 'queued' || status === 'waiting') {
  //     return 'Pending';
  //   }
  //   if (conclusion === 'cancelled' || conclusion === 'skipped') {
  //     return 'Cancelled';
  //   }
  //   return 'Unknown';
  // };

  // 필터링 로직
  const getUniqueValues = (key: keyof WorkflowRun) => {
    const values = runs.map(run => run[key]).filter(Boolean);
    return [...new Set(values)] as string[];
  };

  const uniqueBranches = getUniqueValues('branch');
  const uniqueStatuses = [...new Set(runs.map(run => run.conclusion || run.status))];
  const uniqueAuthors = getUniqueValues('author'); // 실제 데이터에서 작성자 추출

  // 검색어로 필터링된 옵션들 (알파벳 순 정렬)
  const filteredBranches = uniqueBranches
    .filter(branch => branch.toLowerCase().includes(branchSearch.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
    
  const filteredStatuses = uniqueStatuses
    .filter(status => status.toLowerCase().includes(statusSearch.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
    
  const filteredAuthors = uniqueAuthors
    .filter(author => author.toLowerCase().includes(authorSearch.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const filteredRuns = runs.filter(run => {
    const branchMatch = !branchFilter || run.branch === branchFilter;
    const statusMatch = !statusFilter || (run.conclusion || run.status) === statusFilter;
    const authorMatch = !authorFilter || run.author === authorFilter; // 실제 작성자 필터링
    return branchMatch && statusMatch && authorMatch;
  });

  // timestamp 순서대로 정렬 (최신이 위로)
  const sortedRuns = [...filteredRuns].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="history-table-wrapper">
      {/* GitHub Actions 스타일의 런 컨테이너 - 헤더는 항상 표시 */}
      <div className="github-runs-container">
        {/* GitHub Actions 스타일 헤더 */}
        <div className="github-runs-header">
          <div className="header-left">
            <div className="header-title">Workflow runs</div>
            <div className="header-filters">
                {/* Branch 필터 */}
                <div className="history-filter-dropdown">
                  <button 
                    className="history-filter-btn"
                    onClick={toggleBranchDropdown}
                  >
                    Branch {branchFilter && `(${branchFilter})`}
                    <span className={`history-filter-arrow ${showBranchDropdown ? 'up' : 'down'}`}>▼</span>
                  </button>
                  {showBranchDropdown && (
                    <div className="history-dropdown-menu">
                      <div className="history-dropdown-search">
                        <input 
                          type="text" 
                          placeholder="Filter branches" 
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                        />
                      </div>

                      {filteredBranches.map(branch => (
                        <div 
                          key={branch} 
                          className={`history-dropdown-item ${branchFilter === branch ? 'checked' : ''}`}
                          onClick={() => {
                            setBranchFilter(branchFilter === branch ? '' : branch);
                            setShowBranchDropdown(false);
                          }}
                        >
                          <span>{branch}</span>
                          <span className="check-icon">✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status 필터 */}
                <div className="history-filter-dropdown">
                  <button 
                    className="history-filter-btn"
                    onClick={toggleStatusDropdown}
                  >
                    Status {statusFilter && `(${statusFilter})`}
                    <span className={`history-filter-arrow ${showStatusDropdown ? 'up' : 'down'}`}>▼</span>
                  </button>
                  {showStatusDropdown && (
                    <div className="history-dropdown-menu">
                      <div className="history-dropdown-search">
                        <input 
                          type="text" 
                          placeholder="Filter statuses" 
                          value={statusSearch}
                          onChange={(e) => setStatusSearch(e.target.value)}
                        />
                      </div>

                      {filteredStatuses.map(status => (
                        <div 
                          key={status} 
                          className={`history-dropdown-item ${statusFilter === status ? 'checked' : ''}`}
                          onClick={() => {
                            setStatusFilter(statusFilter === status ? '' : status);
                            setShowStatusDropdown(false);
                          }}
                        >
                          <span>{status}</span>
                          <span className="check-icon">✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Author 필터 */}
                <div className="history-filter-dropdown">
                  <button 
                    className="history-filter-btn"
                    onClick={toggleAuthorDropdown}
                  >
                    Author {authorFilter && `(${authorFilter})`}
                    <span className={`history-filter-arrow ${showAuthorDropdown ? 'up' : 'down'}`}>▼</span>
                  </button>
                  {showAuthorDropdown && (
                    <div className="history-dropdown-menu">
                      <div className="history-dropdown-search">
                        <input 
                          type="text" 
                          placeholder="Filter authors" 
                          value={authorSearch}
                          onChange={(e) => setAuthorSearch(e.target.value)}
                        />
                      </div>

                      {filteredAuthors.map(author => (
                        <div 
                          key={author} 
                          className={`history-dropdown-item ${authorFilter === author ? 'checked' : ''}`}
                          onClick={() => {
                            setAuthorFilter(authorFilter === author ? '' : author);
                            setShowAuthorDropdown(false);
                          }}
                        >
                          <span>{author}</span>
                          <span className="check-icon">✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="header-count">{sortedRuns.length} workflow runs</div>
          </div>
          
          {/* 결과 부분 - 조건부 표시 */}
          {sortedRuns.length > 0 ? (
            <div className="runs-list">
              {sortedRuns.map((run) => (
                <div key={run.id} className={`github-run-item ${getStatusClass(run.status, run.conclusion)}`} onClick={() => onRunClick(run.id)}>
                  {/* 왼쪽: 상태 아이콘 */}
                  <div className="run-status-icon">
                    <StatusIndicator status={run.status} conclusion={run.conclusion} />
                  </div>
                  
                  {/* 오른쪽: 메인 콘텐츠 */}
                  <div className="run-main-content">
                    {/* 첫 번째 줄: 제목과 메타 정보 */}
                    <div className="run-title-line">
                      <div className="run-title">
                        <span className="run-name">{run.reason || 'Workflow Run'}</span>
                        <span className="run-id">#{run.id}</span>
                      </div>
                      <div className="run-meta">
                        {/* 브랜치 표기 - 기존 로직 그대로 */}
                        {run.branch ? (
                          <>
                            <span className="run-branch-tag">{run.branch}</span>
                            <span className="branch-separator">|</span>
                          </>
                        ) : (
                          <>
                            <span className="no-branch">-</span>
                            <span className="branch-separator">|</span>
                          </>
                        )}
                        <span className="run-time-ago">{formatTimeAgo(run.timestamp)}</span>
                      </div>
                    </div>
                    
                    {/* 두 번째 줄: 커밋 정보 (Dashboard와 동일한 데이터) */}
                    <div className="run-commit-line">
                      <span className="run-commit-info">
                        Commit <span className="commit-hash">{run.commit || 'unknown'}</span> pushed by <span className="commit-author">{run.author || 'unknown'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>필터 조건에 맞는 실행 기록이 없습니다.</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default HistoryTable;