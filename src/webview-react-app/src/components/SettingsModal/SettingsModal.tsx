import { useState, useEffect } from 'react';
import './SettingsModal.css';

// VSCode API
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

export interface SettingsData {
  githubAuthenticated: boolean;
  githubUser?: { username: string; avatarUrl: string; name: string } | null;
  openaiApiKey: string;
  repositoryUrl: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  initialData?: Partial<SettingsData>;
  onSave: (data: SettingsData) => void;
  onClose?: () => void;
  isInitialSetup?: boolean; // 초기 설정인 경우 닫기 버튼 숨김
}

const SettingsModal = ({ 
  isOpen, 
  initialData = {}, 
  onSave, 
  onClose,
  isInitialSetup = false 
}: SettingsModalProps) => {
  console.log('[SettingsModal] 렌더링됨:', { isOpen, isInitialSetup, initialData });
  
  const [githubAuthenticated, setGithubAuthenticated] = useState(false);
  const [githubUser, setGithubUser] = useState<{ username: string; avatarUrl: string; name: string } | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[SettingsModal] 초기 데이터 설정:', initialData);
      setGithubAuthenticated(initialData.githubAuthenticated || false);
      setGithubUser(initialData.githubUser || null);
      setOpenaiApiKey(initialData.openaiApiKey || '');
      setRepositoryUrl(initialData.repositoryUrl || '');
      setErrors({});
      
      console.log('[SettingsModal] 설정된 상태:', {
        githubAuthenticated: initialData.githubAuthenticated || false,
        githubUser: initialData.githubUser,
        openaiApiKey: initialData.openaiApiKey || '',
        repositoryUrl: initialData.repositoryUrl || ''
      });
    }
  }, [isOpen, initialData]);

  const handleGithubLogin = async () => {
    setIsAuthenticating(true);
    try {
      // VSCode Extension으로 GitHub 로그인 요청 메시지 전송
      console.log('[SettingsModal] GitHub 로그인 요청');
      const vscode = getVscode();
      if (vscode) {
        vscode.postMessage({ 
          command: 'requestGithubLogin' 
        });
      } else {
        console.error('[SettingsModal] vscode 객체가 없어서 GitHub 로그인 요청 실패');
        setErrors({ ...errors, github: 'VSCode API에 접근할 수 없습니다.' });
        setIsAuthenticating(false);
      }
      
      // 로그인 결과는 window message event로 받음
      // 실제 인증 성공 여부는 extension에서 응답으로 전달됨
    } catch (error) {
      console.error('GitHub 로그인 요청 실패:', error);
      setErrors({ ...errors, github: 'GitHub 로그인 요청에 실패했습니다.' });
      setIsAuthenticating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!githubAuthenticated) {
      newErrors.github = 'GitHub 로그인이 필요합니다.';
    }

    if (!openaiApiKey.trim()) {
      newErrors.openaiApiKey = 'OpenAI API 키를 입력해주세요.';
    } else if (!openaiApiKey.startsWith('sk-')) {
      newErrors.openaiApiKey = '올바른 OpenAI API 키 형식이 아닙니다. (sk-로 시작해야 함)';
    }

    if (!repositoryUrl.trim()) {
      newErrors.repositoryUrl = '레포지토리 URL을 입력해주세요.';
    } else {
      // owner/repo 형식 또는 GitHub URL 형식 검증
      const isOwnerRepoFormat = /^[^/]+\/[^/]+$/.test(repositoryUrl.trim());
      const isGithubUrl = /github[^/:]*[:/]+([^/]+)\/([^/]+?)(?:\.git)?$/i.test(repositoryUrl.trim());
      
      if (!isOwnerRepoFormat && !isGithubUrl) {
        newErrors.repositoryUrl = 'owner/repo 형식 또는 유효한 GitHub URL을 입력해주세요.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      console.log('[SettingsModal] 폼 검증 통과, 설정 저장 시작');
      const data = {
        githubAuthenticated,
        openaiApiKey: openaiApiKey.trim(),
        repositoryUrl: repositoryUrl.trim(),
      };
      
      console.log('[SettingsModal] 저장할 데이터:', data);
      
      // Extension으로 설정 저장 요청
      const vscode = getVscode();
      if (vscode) {
        vscode.postMessage({
          command: 'saveSettings',
          payload: data
        });
        
        // 메시지 전송 후 바로 모달 닫기 및 데이터 새로고침 (백업 방법)
        setTimeout(() => {
          console.log('[SettingsModal] 백업 방법으로 모달 닫기 및 새로고침');
          onSave(data);
        }, 500);
      } else {
        console.error('[SettingsModal] vscode 객체가 없어서 설정 저장 실패');
        setErrors({ ...errors, general: 'VSCode API에 접근할 수 없습니다.' });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  // window message 이벤트 리스너 - GitHub 로그인 결과 받기
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'githubLoginResult') {
        if (message.payload.success) {
          setGithubAuthenticated(true);
          setGithubUser({
            username: message.payload.username,
            avatarUrl: message.payload.avatarUrl,
            name: message.payload.name
          });
          setErrors({ ...errors, github: '' });
        } else {
          setGithubAuthenticated(false);
          setGithubUser(null);
          setErrors({ ...errors, github: message.payload.error || 'GitHub 로그인에 실패했습니다.' });
        }
        setIsAuthenticating(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [errors]);

  console.log('[SettingsModal] 렌더링 조건 확인:', { isOpen, shouldRender: isOpen });
  
  if (!isOpen) {
    console.log('[SettingsModal] 모달이 닫혀있어서 렌더링하지 않음');
    return null;
  }
  
  console.log('[SettingsModal] 모달 렌더링 시작');

  return (
    <div className="settings-modal-overlay" onClick={isInitialSetup ? undefined : onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} onKeyPress={handleKeyPress}>
        <div className="settings-modal-header">
          <h2>🛠️ MAD Ops 설정</h2>
          {!isInitialSetup && onClose && (
            <button className="settings-modal-close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          )}
        </div>

        <div className="settings-modal-body">
          {isInitialSetup && (
            <div className="settings-welcome-message">
              <p>MAD Ops를 사용하기 위해 먼저 설정을 완료해주세요.</p>
            </div>
          )}

          {/* GitHub 로그인 섹션 */}
          <div className="settings-section">
            <label className="settings-label">
              <span className="settings-label-text">1. GitHub 로그인</span>
              <span className="settings-label-required">*</span>
            </label>
            <div className="settings-github-login">
              {githubAuthenticated ? (
                githubUser && (
                  <div className="settings-github-user-info">
                    {githubUser.avatarUrl && (
                      <img 
                        src={githubUser.avatarUrl} 
                        alt={githubUser.username}
                        className="settings-github-avatar"
                      />
                    )}
                    <div className="settings-github-details">
                      <div className="settings-github-name">{githubUser.name}</div>
                      <div className="settings-github-username">@{githubUser.username}</div>
                    </div>
                    <div className="settings-status-success">
                      <span className="settings-status-icon">✓</span>
                      <span>로그인 완료</span>
                    </div>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  className="settings-button settings-button-github"
                  onClick={handleGithubLogin}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? '로그인 중...' : 'GitHub로 로그인'}
                </button>
              )}
            </div>
            {errors.github && <div className="settings-error">{errors.github}</div>}
            <div className="settings-help-text">
              VS Code의 GitHub 계정 인증을 통해 로그인합니다.
            </div>
          </div>

          {/* OpenAI API 키 섹션 */}
          <div className="settings-section">
            <label htmlFor="openai-api-key" className="settings-label">
              <span className="settings-label-text">2. OpenAI API 키</span>
              <span className="settings-label-required">*</span>
            </label>
            <div className="settings-input-wrapper">
              <input
                id="openai-api-key"
                type={showApiKey ? "text" : "password"}
                className={`settings-input ${errors.openaiApiKey ? 'settings-input-error' : ''}`}
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                autoComplete="off"
              />
              {openaiApiKey && (
                <button
                  type="button"
                  className="settings-input-toggle"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? "API 키 숨기기" : "API 키 보기"}
                >
                  {showApiKey ? (
                    // 일반 눈 아이콘
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    // 눈에 사선이 그어진 아이콘
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              )}
            </div>
            {errors.openaiApiKey && <div className="settings-error">{errors.openaiApiKey}</div>}
            <div className="settings-help-text">
              LLM 분석을 위한 OpenAI API 키를 입력하세요. 
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const vscode = getVscode();
                  if (vscode) {
                    vscode.postMessage({
                      command: 'openExternalUrl',
                      payload: { url: 'https://platform.openai.com/api-keys' }
                    });
                  }
                }}
                className="settings-link"
              >
                API 키 발급받기
              </a>
            </div>
          </div>

          {/* 레포지토리 URL 섹션 */}
          <div className="settings-section">
            <label htmlFor="repository-url" className="settings-label">
              <span className="settings-label-text">3. 분석할 레포지토리</span>
              <span className="settings-label-required">*</span>
            </label>
            <input
              id="repository-url"
              type="text"
              className={`settings-input ${errors.repositoryUrl ? 'settings-input-error' : ''}`}
              placeholder="owner/repo 또는 https://github.com/owner/repo"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
            />
            {errors.repositoryUrl && <div className="settings-error">{errors.repositoryUrl}</div>}
            <div className="settings-help-text">
              분석할 GitHub 저장소를 입력하세요. (예: facebook/react)
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          {!isInitialSetup && onClose && (
            <button 
              type="button" 
              className="settings-button settings-button-secondary"
              onClick={onClose}
            >
              취소
            </button>
          )}
          <button 
            type="button" 
            className="settings-button settings-button-primary"
            onClick={handleSave}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

