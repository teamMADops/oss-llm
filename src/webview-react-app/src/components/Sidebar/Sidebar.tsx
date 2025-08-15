import React from 'react';
import './Sidebar.css';

interface Action {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running';
}

interface SidebarProps {
  actions: Action[];
  selectedAction: string | null;
  dropdownStates: {
    [key: string]: {
      isOpen: boolean;
      selectedItem: string | null;
    };
  };
  sidebarCollapsed: boolean;
  onActionSelect: (actionId: string) => void;
  onDropdownItemSelect: (actionId: string, itemType: string) => void;
  onSidebarToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  actions,
  selectedAction,
  dropdownStates,
  sidebarCollapsed,
  onActionSelect,
  onDropdownItemSelect,
  onSidebarToggle
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#00FF04';
      case 'failed': return '#FF0000';
      case 'running': return '#FFA500';
      default: return '#8B949E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Success';
      case 'failed': return 'Failed';
      case 'running': return 'Running';
      default: return 'Unknown';
    }
  };

  return (
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
              className={`action-item ${selectedAction === action.id ? 'selected' : ''}`}
              onClick={() => onActionSelect(action.id)}
            >
              <div className="action-status-indicator">
                {action.status === 'failed' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6.5" stroke="#FF0000" strokeWidth="1" fill="none"/>
                    <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="#FF0000" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : action.status === 'running' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="3" cy="8" r="2" fill="#FF8800" opacity="0.3"/>
                    <circle cx="8" cy="8" r="2" fill="#FF8800" opacity="0.6"/>
                    <circle cx="13" cy="8" r="2" fill="#FF8800" opacity="1"/>
                  </svg>
                ) : (
                  <div 
                    className="status-dot" 
                    style={{ backgroundColor: getStatusColor(action.status) }}
                  ></div>
                )}
              </div>
              <span className="action-name">{action.name}</span>
              <span className="action-status" style={{ color: getStatusColor(action.status) }}>
                {getStatusText(action.status)}
              </span>
            </div>
            
            {/* Dropdown 메뉴 - action-item과 별도로 배치 */}
            {(() => {
              const dropdownState = dropdownStates[action.id];
              console.log(`Action ${action.id}의 dropdown 조건 확인:`, dropdownState?.isOpen);
              return dropdownState?.isOpen ? (
                <div className="action-dropdown">
                  <div 
                    className={`dropdown-item ${dropdownState.selectedItem === 'editor' ? 'selected' : ''}`}
                    onClick={() => onDropdownItemSelect(action.id, 'editor')}
                  >
                    <img 
                      src="/src/assets/Editor_default.svg" 
                      alt="Editor" 
                      className="dropdown-icon"
                      width="16"
                      height="16"
                    />
                    <span>Editor</span>
                  </div>
                  <div 
                    className={`dropdown-item ${dropdownState.selectedItem === 'history' ? 'selected' : ''}`}
                    onClick={() => onDropdownItemSelect(action.id, 'history')}
                  >
                    <img 
                      src="/src/assets/history_default.svg" 
                      alt="Run History" 
                      className="dropdown-icon"
                      width="16"
                      height="16"
                    />
                    <span>Run History</span>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;