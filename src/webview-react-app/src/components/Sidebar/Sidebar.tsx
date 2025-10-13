import React from 'react';
import './Sidebar.css';
import { Action } from './types';
import { EditorIcon, HistoryIcon, ActionIcon } from '@/components/common/Icons';

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
  onOpenSettings: () => void;
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
  onSidebarToggle,
  onOpenSettings
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
                  <ActionIcon />
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
                      className={`dropdown-item ${activePage === 'history' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage('history');
                      }}
                    >
                      <span className="dropdown-icon">
                        <HistoryIcon />
                      </span>
                      <span>Run History</span>
                    </div>
                    <div 
                      className={`dropdown-item ${activePage === 'editor' ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage('editor');
                      }}
                    >
                      <span className="dropdown-icon">
                        <EditorIcon />
                      </span>
                      <span>Editor</span>
                    </div>
                  </div>
              )}
            </div>
          ))}
        </div>

        {/* 설정 버튼 */}
        <div className="sidebar-footer">
          <button className="sidebar-settings-button" onClick={onOpenSettings} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Settings</span>
          </button>
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
