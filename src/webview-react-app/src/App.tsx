import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Editor from './pages/Editor/Editor';
import HistoryPage from './pages/History/History';
import { Action } from './components/Sidebar/types';
import './styles/theme.css';

function App() {
  const [page, setPage] = useState('dashboard'); // Default page
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    setSelectedActionId(actionId);
    // Typically, selecting an action would navigate to the dashboard for that action
    setPage('dashboard');
  };

  const handleSelectPage = (pageName: string) => {
    setPage(pageName);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard actionId={selectedActionId} />;
      case 'editor':
        return <Editor actionId={selectedActionId} />;
      case 'history':
        return <HistoryPage actionId={selectedActionId} />;
      default:
        return <Dashboard actionId={selectedActionId} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        actions={actions}
        selectedActionId={selectedActionId}
        activePage={page}
        sidebarCollapsed={sidebarCollapsed}
        onSelectAction={handleSelectAction}
        onSelectPage={handleSelectPage}
        onSidebarToggle={handleSidebarToggle}
      />
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
