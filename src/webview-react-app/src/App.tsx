/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import RunLogPage from '@/pages/RunLog/RunLog.tsx';
import EditorPage from './pages/Editor/Editor';
import HistoryPage from './pages/History/History';
import SettingsModal, { SettingsData } from './components/SettingsModal/SettingsModal';
import { LLMResult } from '../../llm/types'; // Import LLMResult type
import { Action } from './components/Sidebar/types'; // Import Action type
import { getActions } from './api/github'; // analyzeRun import 제거
import './styles/theme.css';

// VSCode API 선언
declare global {
  interface Window {
    vscode: {
      postMessage: (message: any) => void;
    };
    getVscode: () => any;
  }
}

// 안전한 vscode 객체 접근
const getVscode = () => {
  if (typeof window !== 'undefined') {
    if (window.getVscode) {
      return window.getVscode();
    }
    if (window.vscode) {
      return window.vscode;
    }
  }
  return null;
};

function App() {
  console.log('[App.tsx] App 컴포넌트 렌더링 시작');
  
  const [currentPage, setCurrentPage] = useState<string>('none'); // 초기 상태: 아무 페이지도 선택 안됨
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [llmAnalysisResult, setLlmAnalysisResult] = useState<LLMResult | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [dropdownActive, setDropdownActive] = useState<boolean>(false);
  const [actionHighlighted, setActionHighlighted] = useState<boolean>(false);
  
  // Settings 상태
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(false);
  const [settingsData, setSettingsData] = useState<Partial<SettingsData>>({});

  console.log('[App.tsx] 현재 상태:', { currentPage, showSettingsModal, isInitialSetup });

  // Actions를 로드하는 함수 (대시보드에서만 사용)
  const loadActions = useCallback(async () => {
    try {
      console.log('[App.tsx] loadActions 시작');
      const fetchedActions = await getActions();
      console.log('[App.tsx] loadActions 결과:', fetchedActions);
      setActions(fetchedActions);
    } catch (error) {
      console.error('[App.tsx] Failed to load actions:', error);
    }
  }, []);

  useEffect(() => {
    console.log('[App.tsx] useEffect 실행됨');
    
    // Handle messages from the extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data; // The JSON data our extension sent
      console.log('[App.tsx] Message from extension:', message);
      
      // settingsSaved 메시지 특별 로그
      if (message.command === 'settingsSaved') {
        console.log('[App.tsx] settingsSaved 메시지 수신됨!', message.payload);
      }

      switch (message.command) {
        case 'changePage':
          setCurrentPage(message.page);
          break;
        case 'llmAnalysisResult': // New case for LLM analysis result
          setLlmAnalysisResult(message.payload);
          setCurrentPage('runLog'); // Ensure runLog is active when result arrives
          break;
        case 'showSettings': // 설정 모달 표시 요청
          console.log('[App.tsx] showSettings 메시지 받음:', message.payload);
          setSettingsData(message.payload?.currentSettings || {});
          setIsInitialSetup(message.payload?.isInitialSetup || false);
          setShowSettingsModal(true);
          console.log('[App.tsx] 모달 표시 상태 변경됨:', true);
          break;
        case 'settingsSaved': // 설정 저장 완료
          console.log('[App.tsx] 설정 저장 완료, 모달 닫기 및 데이터 새로고침');
          setShowSettingsModal(false);
          // [FIX] 레포지토리 변경 시 모든 상태 초기화
          setLlmAnalysisResult(null);
          setSelectedRunId(null);
          setSelectedActionId(null);
          setActionHighlighted(false);
          setDropdownActive(false);
          setCurrentPage('none'); // "워크플로우를 선택해주세요" 화면으로
          // 설정 저장 후 actions 다시 불러오기 (모달은 닫은 상태 유지)
          setTimeout(() => {
            console.log('[App.tsx] 설정 저장 후 actions 새로고침 시작');
            loadActions();
          }, 100);
          break;
        // Add other message handlers here
      }
    };

    window.addEventListener('message', handleMessage);

    // Fetch actions when component mounts (자동 선택 안함)
    const fetchActions = async () => {
      try {
        console.log('[App.tsx] fetchActions 시작');
        const fetchedActions = await getActions();
        console.log('[App.tsx] fetchActions 결과:', fetchedActions);
        setActions(fetchedActions);
        // 자동 선택하지 않음 - 사용자가 직접 선택해야 함
      } catch (error) {
        console.error('[App.tsx] Failed to fetch actions:', error);
      }
    };

    fetchActions();

    // 초기 로드 시 설정 확인 요청 (웹뷰 완전 로드 후)
    setTimeout(() => {
      console.log('[App.tsx] 설정 확인 요청');
      const vscode = getVscode();
      console.log('[App.tsx] vscode 객체:', vscode);
      if (vscode) {
        vscode.postMessage({ command: 'checkSettings' });
        console.log('[App.tsx] checkSettings 메시지 전송됨');
      } else {
        console.error('[App.tsx] vscode 객체가 없습니다!');
        // vscode 객체가 없으면 다시 시도
        setTimeout(() => {
          const retryVscode = getVscode();
          console.log('[App.tsx] 재시도 - vscode 객체:', retryVscode);
          if (retryVscode) {
            retryVscode.postMessage({ command: 'checkSettings' });
            console.log('[App.tsx] 재시도 성공 - checkSettings 메시지 전송됨');
          }
        }, 500);
      }
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [loadActions]);

  const onSelectPage = (pageName: string) => {
    // 드롭다운에서 editor/history 클릭 시
    setCurrentPage(pageName);
    // 선택된 run ID 초기화
    setSelectedRunId(null);
    // action 하이라이트와 드롭다운 상태는 유지
  };

  const onSelectAction = (actionId: string) => {
    if (selectedActionId === actionId && actionHighlighted) {
      // 하이라이트된 action을 다시 클릭한 경우 -> 선택 해제
      console.log(`[App.tsx] 하이라이트된 action 클릭 -> 선택 해제`);
      setSelectedActionId(null);
      setActionHighlighted(false);
      setDropdownActive(false);
      setCurrentPage('none');
      setSelectedRunId(null);
      setLlmAnalysisResult(null);
    } else {
      // 하이라이트 안된 action 클릭 -> 선택 및 History 페이지로 이동
      console.log(`[App.tsx] 새로운 action 선택: ${actionId}`);
      setSelectedActionId(actionId);
      setActionHighlighted(true);
      setDropdownActive(true);
      setCurrentPage('history');
      setSelectedRunId(null);
      setLlmAnalysisResult(null);
    }
  };

  const onSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // [MOD] 실행(run) 분석을 시작하는 함수 - runId를 runLog로 전달
  const handleRunClick = (runId: string) => {
    console.log(`[App.tsx] Run 클릭됨: ${runId}`);
    // [FIX] 이전 LLM 분석 결과 초기화
    setLlmAnalysisResult(null);
    // 선택된 run ID 설정
    setSelectedRunId(runId);
    // 대시보드로 이동
    setCurrentPage('runLog');
    // [FIX] 사이드바 상태 유지를 위해 dropdown/highlight 초기화 제거
  };

  // Settings 저장 핸들러
  const handleSaveSettings = (data: SettingsData) => {
    console.log('[App.tsx] Settings 저장:', data);
    // Extension으로 설정 저장 요청
    const vscode = getVscode();
    if (vscode) {
      vscode.postMessage({
        command: 'saveSettings',
        payload: data
      });
    } else {
      console.error('[App.tsx] vscode 객체가 없어서 설정 저장 실패');
    }
  };

  // Settings 모달 열기 (최신 설정 데이터 요청)
  const handleOpenSettings = () => {
    console.log('[App.tsx] 설정 모달 열기 요청');
    const vscode = getVscode();
    if (vscode) {
      // Extension에 최신 설정 데이터 요청
      vscode.postMessage({
        command: 'checkSettings'
      });
    } else {
      // VSCode API가 없으면 그냥 빈 데이터로 모달 열기
      setSettingsData({});
      setShowSettingsModal(true);
    }
  };

  // Settings 모달 닫기
  const handleCloseSettings = () => {
    if (!isInitialSetup) {
      setShowSettingsModal(false);
    }
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
        onOpenSettings={handleOpenSettings}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-closed' : 'sidebar-open'}`}>
        {currentPage === 'none' && (
          <div className="llm-analysis-empty" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p className="llm-empty-text" style={{ fontSize: '18px' }}>워크플로우를 선택해주세요</p>
          </div>
        )}
        {currentPage === 'runLog' && <RunLogPage actionId={selectedActionId} runId={selectedRunId} isSidebarOpen={!sidebarCollapsed} llmAnalysisResult={llmAnalysisResult} />}
        {currentPage === 'editor' && <EditorPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} />}
        {currentPage === 'history' && <HistoryPage actionId={selectedActionId} isSidebarOpen={!sidebarCollapsed} onRunClick={handleRunClick} />}
      </main>
      
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        initialData={settingsData}
        onSave={handleSaveSettings}
        onClose={handleCloseSettings}
        isInitialSetup={isInitialSetup}
      />
    </div>
  );
}

export default App;
