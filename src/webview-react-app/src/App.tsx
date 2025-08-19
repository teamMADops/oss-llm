import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import DashboardPage from './pages/Dashboard/Dashboard';
import EditorPage from './pages/Editor/Editor';
import HistoryPage from './pages/History/History';
import { LLMResult } from '../../llm/analyze'; // Import LLMResult type
import { Action } from './components/Sidebar/types'; // Import Action type
import { getActions, analyzeRun } from './api/github'; // [MOD] analyzeRun import
import './styles/theme.css';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
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
  };

  const onSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // [ADD] 실행(run) 분석을 시작하는 함수
  const handleRunAnalysis = (runId: string) => {
    console.log(`[App.tsx] Run 분석 시작: ${runId}`);
    // LLM 분석 요청
    analyzeRun(runId);
    // 분석 결과를 표시하기 위해 대시보드 페이지로 전환
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
        {currentPage === 'dashboard' && <DashboardPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} llmAnalysisResult={llmAnalysisResult} />}
        {currentPage === 'editor' && <EditorPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />}
        {currentPage === 'history' && <HistoryPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} onRunClick={handleRunAnalysis} />} {/* [MOD] onRunClick prop 전달 */}
      </main>
    </div>
  );
}

export default App;
