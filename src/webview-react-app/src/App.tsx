import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import DashboardPage from './pages/Dashboard/Dashboard';
import EditorPage from './pages/Editor/Editor';
import HistoryPage from './pages/History/History';
import { LLMResult } from '../../llm/analyze'; // Import LLMResult type
import { Action } from './components/Sidebar/types'; // Import Action type
import { getActions } from './api/github'; // [MOD] analyzeRun import 제거
import './styles/theme.css';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null); // [ADD] 선택된 run ID
  const [llmAnalysisResult, setLlmAnalysisResult] = useState<LLMResult | null>(null);
  const [actions, setActions] = useState<Action[]>([]); // New state for actions
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false); // New state for sidebar collapsed
  const [dropdownActive, setDropdownActive] = useState<boolean>(false); // New state for dropdown active
  const [actionHighlighted, setActionHighlighted] = useState<boolean>(false); // New state for action highlighted // Use LLMResult type

  useEffect(() => {
    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent
      console.log('Message from extension:', message);

      switch (message.command) {
        case 'changePage':
          setCurrentPage(message.page);
          break;
        case 'llmAnalysisResult': // New case for LLM analysis result
          setLlmAnalysisResult(message.payload);
          setCurrentPage('dashboard'); // Ensure dashboard is active when result arrives
          break;
        // Add other message handlers here
      }
    });

    // Fetch actions when component mounts
    const fetchActions = async () => {
      try {
        const fetchedActions = await getActions();
        setActions(fetchedActions);
        
        // [ADD] 첫 번째 action 자동 선택
        if (fetchedActions.length > 0) {
          const firstAction = fetchedActions[0];
          console.log(`[App.tsx] 첫 번째 action 자동 선택: ${firstAction.id}`);
          setSelectedActionId(firstAction.id);
          // 대시보드로 이동하여 가장 최근 run 정보 표시
          setCurrentPage('dashboard');
        }
      } catch (error) {
        console.error('Failed to fetch actions:', error);
      }
    };

    fetchActions();
  }, []);

  const onSelectPage = (pageName: string) => {
    setCurrentPage(pageName);
    // dropdown item 클릭 시 action 하이라이트 비활성화
    setActionHighlighted(false);
    // dropdown은 열린 상태 유지
    setDropdownActive(true);
    // [ADD] 페이지 변경 시 선택된 run ID 초기화
    setSelectedRunId(null);
  };

  const onSelectAction = (actionId: string) => {
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
    setCurrentPage('dashboard');
    // [ADD] 새로운 action 선택 시 선택된 run ID 초기화
    setSelectedRunId(null);
  };

  const onSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // [MOD] 실행(run) 분석을 시작하는 함수 - runId를 Dashboard로 전달
  const handleRunClick = (runId: string) => {
    console.log(`[App.tsx] Run 클릭됨: ${runId}`);
    // 선택된 run ID 설정
    setSelectedRunId(runId);
    // 대시보드로 이동
    setCurrentPage('dashboard');
    // 분석 요청 후 기존 선택 상태 초기화
    setDropdownActive(false);
    setActionHighlighted(false);
  };

  return (
    <div className="app-container">
      <Sidebar
        actions={actions}
        selectedActionId={selectedActionId}
        activePage={currentPage}
        sidebarCollapsed={sidebarCollapsed}
        dropdownActive={dropdownActive}
        actionHighlighted={actionHighlighted}
        onSelectAction={onSelectAction}
        onSelectPage={onSelectPage}
        onSidebarToggle={onSidebarToggle}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}>
        {currentPage === 'dashboard' && <DashboardPage actionId={selectedActionId} runId={selectedRunId} isSidebarOpen={!sidebarCollapsed} llmAnalysisResult={llmAnalysisResult} />}
        {currentPage === 'editor' && <EditorPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />}
        {currentPage === 'history' && <HistoryPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} onRunClick={handleRunClick} />} {/* [MOD] onRunClick prop 전달 */}
      </main>
    </div>
  );
}

export default App;
