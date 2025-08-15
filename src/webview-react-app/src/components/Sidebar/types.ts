// Action 관련 타입 정의
export interface Action {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running' | 'pending' | 'cancelled';
}

// Sidebar Props 타입 정의
export interface SidebarProps {
  actions: Action[];
  selectedActionId: string | null;
  activePage: string;
  onSelectAction: (actionId: string) => void;
  onSelectPage: (pageName: string) => void;
}

// 상태 타입
export type ActionStatus = 'success' | 'failed' | 'running' | 'pending' | 'cancelled';

// 페이지 타입
export type PageType = 'dashboard' | 'editor' | 'history';
