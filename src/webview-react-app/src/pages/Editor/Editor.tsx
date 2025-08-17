import React, { useState, useEffect } from 'react';
import YamlViewer from './YamlViewer';
import { getWorkflowFile, saveWorkflowFile } from '../../api/github';
import './Editor.css';

// Props: App.tsx로부터 받음
interface EditorProps {
  actionId: string | null;
}

// dev/FE의 UI 컴포넌트와 상태 로직을 대부분 재사용
const Editor: React.FC<EditorProps> = ({ actionId }) => {
  // --- State ---
  const [workflowContent, setWorkflowContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // TODO: API로 받아온 YAML을 파싱하여 아래 상태들을 채우는 로직 필요
  // 현재는 dev/FE의 Mock 데이터를 사용하여 UI를 구성
  const [workflowName, setWorkflowName] = useState('CI/CD Workflow');

  // --- Effects ---
  useEffect(() => {
    if (actionId) {
      setIsLoading(true);
      getWorkflowFile(actionId)
        .then(content => {
          setWorkflowContent(content);
          // TODO: content(YAML)를 파싱해서 workflowName 등의 상태를 업데이트해야 함
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [actionId]);

  // --- Handlers ---
  const handleSave = async () => {
    if (!actionId || isSaving) return;
    
    setIsSaving(true);
    try {
      // TODO: 현재 UI 상태(workflowName 등)를 YAML 문자열로 다시 생성하는 로직 필요
      // 지금은 에디터의 내용을 그대로 저장
      await saveWorkflowFile(actionId, workflowContent);
      alert('Workflow saved successfully!');
    } catch (err) {
      alert('Failed to save workflow.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkflowContentChange = (content: string) => {
    setWorkflowContent(content);
  };

  // --- Render ---
  if (!actionId) {
    return (
      <div className="editor-main-content">
        <div className="editor-empty-state">
          <p className="text-muted">워크플로우를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="editor-main-content">
        <div className="editor-loading">
          <p className="text-muted">워크플로우를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <div className="main-header">
          <div className="header-left">
            <h1 className="main-title">Workflow Editor</h1>
          </div>
          <div className="header-right">
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* dev/FE의 워크플로우 편집 UI를 여기에 통합 */}
        <div className="workflow-editor">
          {/* Workflow Name */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">Workflow Name</h2>
            </div>
            <div className="section-content">
              <input
                type="text"
                className="workflow-name-input"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
              />
            </div>
          </div>

          {/* YAML Content Editor */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">YAML Content</h2>
            </div>
            <div className="section-content">
              <textarea
                className="yaml-editor-textarea"
                value={workflowContent}
                onChange={(e) => handleWorkflowContentChange(e.target.value)}
                placeholder="Enter YAML content..."
                rows={20}
              />
            </div>
          </div>

          {/* Triggers, Jobs 등 dev/FE의 UI 컴포넌트들을 여기에 추가... */}
          {/* 이 부분은 생략되었지만, dev/FE의 JSX를 가져와서 채울 수 있습니다. */}

        </div>
      </div>

      {/* 우측 YAML 미리보기 */}
      <YamlViewer yamlContent={workflowContent} highlightedLines={[]} />
    </div>
  );
};

export default Editor;