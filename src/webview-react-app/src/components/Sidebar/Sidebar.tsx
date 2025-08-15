import React from 'react';
import { SidebarProps, ActionStatus } from './types';
import './Sidebar.css';

// TODO : 아이콘을 아이콘 라이브러리 or svg 파일로 교체
// 상태별 아이콘 컴포넌트
const StatusIcon: React.FC<{ status: ActionStatus }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <div className="status-icon status-icon-success">●</div>;
    case 'failed':
      return <div className="status-icon status-icon-failed">●</div>;
    case 'running':
      return <div className="status-icon status-icon-running">●</div>;
    case 'pending':
      return <div className="status-icon status-icon-pending">●</div>;
    case 'cancelled':
      return <div className="status-icon status-icon-cancelled">●</div>;
    default:
      return <div className="status-icon status-icon-neutral">●</div>;
  }
};

// 상태별 텍스트 표시
const StatusText: React.FC<{ status: ActionStatus }> = ({ status }) => {
  const getStatusText = (status: ActionStatus) => {
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
        return 'Unknown';
    }
  };

  return <span className={`status-text status-text-${status}`}>{getStatusText(status)}</span>;
};

// Sidebar 컴포넌트
const Sidebar: React.FC<SidebarProps> = ({
  actions,
  selectedActionId,
  activePage,
  onSelectAction,
  onSelectPage,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Actions</h2>
      </div>
      
      <div className="sidebar-content">
        <div className="actions-list">
          {actions.map((action) => (
            <div key={action.id} className="action-group">
              {/* Action 메인 버튼 */}
              <button
                className={`action-button ${
                  selectedActionId === action.id ? 'action-button-selected' : ''
                }`}
                onClick={() => onSelectAction(action.id)}
              >
                <div className="action-button-content">
                  <StatusIcon status={action.status} />
                  <span className="action-name">{action.name}</span>
                  <StatusText status={action.status} />
                </div>
              </button>

              {/* 선택된 Action의 하위 메뉴 */}
              {selectedActionId === action.id && (
                <div className="action-submenu">
                  <button
                    className={`submenu-button ${
                      activePage === 'editor' ? 'submenu-button-active' : ''
                    }`}
                    onClick={() => onSelectPage('editor')}
                  >
                    <span className="submenu-icon">🔧</span>
                    <span className="submenu-text">Editor</span>
                  </button>
                  
                  <button
                    className={`submenu-button ${
                      activePage === 'history' ? 'submenu-button-active' : ''
                    }`}
                    onClick={() => onSelectPage('history')}
                  >
                    <span className="submenu-icon">📋</span>
                    <span className="submenu-text">Run history</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;