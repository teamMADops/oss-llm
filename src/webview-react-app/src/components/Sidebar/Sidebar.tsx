import React from 'react';
import './Sidebar.css';
import { Action, ActionStatus } from './types';
import EditorIcon from '../../assets/Editor_default.svg';
import HistoryIcon from '../../assets/history_default.svg';
import ActionIcon from '../../assets/action.svg';

// SidebarProps 정의: App.tsx로부터 받는 props
interface SidebarProps {
  actions: Action[];
  selectedActionId: string | null;
  activePage: string;
  sidebarCollapsed: boolean;
  dropdownActive: boolean;
  actionHighlighted: boolean;
  onSelectAction: (actionId: string) => void;
  onSelectPage: (pageName: string) => void;
  onSidebarToggle: () => void;
}




const Sidebar: React.FC<SidebarProps> = ({
  actions,
  selectedActionId,
  activePage,
  sidebarCollapsed,
  dropdownActive,
  actionHighlighted,
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
                className={`action-item ${selectedActionId === action.id && actionHighlighted ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAction(action.id)
                }}
              >
                <span className="action-file-icon">
                  <img src={ActionIcon} alt="action" />
                </span>
                <span className="action-name">{action.name}</span>
                <span className={`action-arrow ${selectedActionId === action.id && dropdownActive ? 'up' : 'down'}`}>
                  ▼
                </span>
              </div>
              
              {/* Dropdown 메뉴: dropdownActive 상태에 따라 표시 */}
              {selectedActionId === action.id && dropdownActive && (
                  <div className="action-dropdown">
                    <div 
                      className={`dropdown-item ${activePage === 'editor' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage('editor');
                      }}
                    >
                      <span className="dropdown-icon">
                        <img src={EditorIcon} alt="editor" />
                      </span>
                      <span>Editor</span>
                    </div>
                    <div 
                      className={`dropdown-item ${activePage === 'history' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage('history');
                      }}
                    >
                      <span className="dropdown-icon">
                        <img src={HistoryIcon} alt="history" />
                      </span>
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
