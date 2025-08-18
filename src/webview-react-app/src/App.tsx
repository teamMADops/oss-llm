import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Editor from './pages/Editor/Editor';
import HistoryPage from './pages/History/History';
import { Action } from './components/Sidebar/types';
import './styles/theme.css';

function App() {
  const [page, setPage] = useState('dashboard');
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false);
  const [actionHighlighted, setActionHighlighted] = useState(true);

  // Mock data for now, will be replaced by API calls
  const mockActions: Action[] = useMemo(() => [
    { id: 'action-one', name: 'Action one_happy', status: 'success' },
    { id: 'action-two', name: 'Action twooo', status: 'failed' },
    { id: 'action-three', name: 'Action three', status: 'running' },
  ], []);

  useEffect(() => {
    // --- Set up message listener for routing ---
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'changePage') {
        setPage(message.page);
      }
      // TODO: Add listeners for API responses (e.g., 'showActions')
    };
    window.addEventListener('message', handleMessage);

    // --- Fetch initial data ---
    // githubApi.getActions(); // TODO: Uncomment when API is implemented
    setActions(mockActions); // Using mock data for now
    if (mockActions.length > 0) {
        setSelectedActionId(mockActions[0].id);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [mockActions]);

  const handleSelectAction = (actionId: string) => {
    if (selectedActionId === actionId) {
      // 이미 선택된 action을 다시 클릭한 경우
      if (dropdownActive && !actionHighlighted) {
        // dropdown이 활성화되고 action이 하이라이트되지 않은 상태면 action 하이라이트 활성화
        setActionHighlighted(true);
      } else if (dropdownActive && actionHighlighted) {
        // dropdown이 활성화되고 action이 하이라이트된 상태면 dropdown 비활성화
        setDropdownActive(false);
      } else {
        // dropdown이 비활성화된 상태면 dropdown 활성화
        setDropdownActive(true);
      }
    } else {
      // 새로운 action을 선택한 경우
      setSelectedActionId(actionId);
      setDropdownActive(true); // dropdown 활성화
      setActionHighlighted(true); // action 하이라이트 활성화
    }
    // 항상 dashboard로 이동
    setPage('dashboard');
  };

  const handleSelectPage = (pageName: string) => {
    setPage(pageName);
    // dropdown item 클릭 시 action 하이라이트 비활성화
    setActionHighlighted(false);
    // dropdown은 열린 상태 유지
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />;
      case 'editor':
        return <Editor actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />;
      case 'history':
        return <HistoryPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />;
      default:
        return <Dashboard actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        actions={actions}
        selectedActionId={selectedActionId}
        activePage={page}
        sidebarCollapsed={sidebarCollapsed}
        dropdownActive={dropdownActive}
        actionHighlighted={actionHighlighted}
        onSelectAction={handleSelectAction}
        onSelectPage={handleSelectPage}
        onSidebarToggle={handleSidebarToggle}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
