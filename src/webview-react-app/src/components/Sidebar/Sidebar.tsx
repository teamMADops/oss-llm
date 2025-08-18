import React from 'react';
import './Sidebar.css';
import { Action, ActionStatus } from './types';

// SidebarProps 정의: App.tsx로부터 받는 props
interface SidebarProps {
  actions: Action[];
  selectedActionId: string | null;
  activePage: string;
  sidebarCollapsed: boolean;
  onSelectAction: (actionId: string) => void;
  onSelectPage: (pageName: string) => void;
  onSidebarToggle: () => void;
}

// dev/FE의 아이콘/상태 컴포넌트 재사용
const getStatusColor = (status: ActionStatus) => {
  switch (status) {
    case 'success': return '#00FF04';
    case 'failed': return '#FF0000';
    case 'running': return '#FFA500';
    default: return '#8B949E';
  }
};

const getStatusText = (status: ActionStatus) => {
  switch (status) {
    case 'success': return 'Success';
    case 'failed': return 'Failed';
    case 'running': return 'Running';
    default: return 'Unknown';
  }
};

const StatusIndicator: React.FC<{ status: ActionStatus }> = ({ status }) => {
    if (status === 'failed') {
        return (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" stroke="#FF0000" strokeWidth="1" fill="none"/>
                <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="#FF0000" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        );
    }
    if (status === 'running') {
        return (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="3" cy="8" r="2" fill="#FF8800" opacity="0.3"/>
                <circle cx="8" cy="8" r="2" fill="#FF8800" opacity="0.6"/>
                <circle cx="13" cy="8" r="2" fill="#FF8800" opacity="1"/>
            </svg>
        );
    }
    return <div className={`status-dot status-${status}`}></div>;
};


const Sidebar: React.FC<SidebarProps> = ({
  actions,
  selectedActionId,
  activePage,
  sidebarCollapsed,
  onSelectAction,
  onSelectPage,
  onSidebarToggle
}) => {

  return (
    <>
      <div className={`editor-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">Actions</h1>
          <button className="sidebar-toggle-btn" onClick={onSidebarToggle}>
            <svg viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
        </div>

        <div className="actions-list">
          {actions.map((action) => (
            <div key={action.id}>
              <div
                className={`action-item ${selectedActionId === action.id ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation(); // 이벤트 버블링 방지
                  onSelectAction(action.id);
                }}
              >
                <div className="action-status-indicator">
                    <StatusIndicator status={action.status} />
                </div>
                <span className="action-name">{action.name}</span>
                <span className={`action-status status-${action.status}`}>
                  {getStatusText(action.status)}
                </span>
              </div>
              
              {/* Dropdown 메뉴: FE/eodudrepublic의 로직(선택된 액션에만 표시)과 dev/FE의 스타일을 결합 */}
              {selectedActionId === action.id && (
                  <div className="action-dropdown">
                    <div 
                      className={`dropdown-item ${activePage === 'editor' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // 이벤트 버블링 방지
                        onSelectPage('editor');
                      }}
                    >
                      {/* 아이콘은 나중에 SVG 파일로 교체하는 것이 좋습니다. */}
                      <span className="dropdown-icon">🔧</span>
                      <span>Editor</span>
                    </div>
                    <div 
                      className={`dropdown-item ${activePage === 'history' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // 이벤트 버블링 방지
                        onSelectPage('history');
                      }}
                    >
                      <span className="dropdown-icon">📋</span>
                      <span>Run History</span>
                    </div>
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* 사이드바가 닫혔을 때 표시되는 화살표 버튼 */}
      {sidebarCollapsed && (
        <div className="sidebar-collapsed-arrow" onClick={onSidebarToggle}>
            <svg viewBox="0 0 24 24" fill="white">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
        </div>
      )}
    </>
  );
};

export default Sidebar;
