import React from 'react';
import './Sidebar.css';
import { Action } from './types';

// 실제 assets 폴더의 SVG 내용을 인라인으로 정의
const EditorIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.43333 11.8L5.4 7.73333C5.17778 7.82222 4.95289 7.88889 4.72533 7.93333C4.49778 7.97778 4.256 8 4 8C2.88889 8 1.94444 7.61111 1.16667 6.83333C0.388889 6.05556 0 5.11111 0 4C0 3.6 0.0555556 3.21956 0.166667 2.85867C0.277778 2.49778 0.433333 2.156 0.633333 1.83333L3.06667 4.26667L4.26667 3.06667L1.83333 0.633333C2.15556 0.433333 2.49733 0.277778 2.85867 0.166667C3.22 0.0555556 3.60044 0 4 0C5.11111 0 6.05556 0.388889 6.83333 1.16667C7.61111 1.94444 8 2.88889 8 4C8 4.25556 7.97778 4.49733 7.93333 4.72533C7.88889 4.95333 7.82222 5.17822 7.73333 5.4L11.8 9.43333C11.9333 9.56667 12 9.72778 12 9.91667C12 10.1056 11.9333 10.2667 11.8 10.4L10.4 11.8C10.2667 11.9333 10.1056 12 9.91667 12C9.72778 12 9.56667 11.9333 9.43333 11.8Z" fill="currentColor"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0C6.4087 0 4.88258 0.632141 3.75736 1.75736C2.63214 2.88258 2 4.4087 2 6H0L2.59333 8.59333L2.64 8.68666L5.33333 6H3.33333C3.33333 3.42 5.42 1.33333 8 1.33333C10.58 1.33333 12.6667 3.42 12.6667 6C12.6667 8.58 10.58 10.6667 8 10.6667C6.71333 10.6667 5.54667 10.14 4.70667 9.29333L3.76 10.24C4.31552 10.7988 4.97622 11.242 5.70396 11.5441C6.4317 11.8462 7.21206 12.0011 8 12C9.5913 12 11.1174 11.3679 12.2426 10.2426C13.3679 9.11742 14 7.5913 14 6C14 4.4087 13.3679 2.88258 12.2426 1.75736C11.1174 0.632141 9.5913 2.37122e-08 8 0ZM7.33333 3.33333V6.66666L10.1667 8.34666L10.68 7.49333L8.33333 6.1V3.33333H7.33333Z" fill="currentColor"/>
  </svg>
);

const ActionIcon = () => (
  <svg width="19" height="15" viewBox="0 0 19 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.9 15C1.3775 15 0.930367 14.8166 0.5586 14.4497C0.186833 14.0828 0.000633333 13.6412 0 13.125V1.875C0 1.35937 0.1862 0.918125 0.5586 0.55125C0.931 0.184375 1.37813 0.000625 1.9 0H7.6L9.5 1.875H17.1C17.6225 1.875 18.0699 2.05875 18.4423 2.42625C18.8147 2.79375 19.0006 3.235 19 3.75V13.125C19 13.6406 18.8141 14.0822 18.4423 14.4497C18.0706 14.8172 17.6231 15.0006 17.1 15H1.9Z" fill="currentColor"/>
  </svg>
);

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
