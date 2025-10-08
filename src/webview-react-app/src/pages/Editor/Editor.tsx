/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import React, { useState, useEffect } from 'react';
import YamlViewer from './YamlViewer';
import { getWorkflowFile, saveWorkflowFile } from '@/api/github';
import './Editor.css';

// Props: App.tsx로부터 받음
interface EditorProps {
  actionId: string | null;
  isSidebarOpen?: boolean;
}

// dev/FE의 UI 컴포넌트와 상태 로직을 대부분 재사용
const Editor: React.FC<EditorProps> = ({ actionId, isSidebarOpen = true }) => {
  // --- State ---
  const [workflowContent, setWorkflowContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // TODO: API로 받아온 YAML을 파싱하여 아래 상태들을 채우는 로직 필요
  // 현재는 dev/FE의 Mock 데이터를 사용하여 UI를 구성
  const [workflowName, setWorkflowName] = useState('CI/CD Workflow');

  // FE/sungwon의 정교한 UI를 위한 상태 변수들
  const [workflowTriggers, setWorkflowTriggers] = useState({
    push: { branches: ['main'], enabled: true },
    pull_request: { 
      types: ['opened', 'synchronize'], 
      branches: ['main'], 
      paths: [],
      enabled: false 
    }
  });

  const [jobs, setJobs] = useState([
    {
      name: 'build',
      runsOn: ['ubuntu-latest'],
      steps: [
        { name: 'Checkout code', uses: 'actions/checkout@v4' },
        { name: 'Setup Node.js', uses: 'actions/setup-node@v4' },
        { name: 'Install dependencies', run: 'npm ci' }
      ]
    }
  ]);

  // 메인 패널 dropdown 상태
  const [mainPanelDropdowns, setMainPanelDropdowns] = useState<{
    [key: string]: boolean;
  }>({});

  // 하이라이트할 라인 상태
  const [highlightedLines, setHighlightedLines] = useState<{
    [key: string]: number[]; // 'push-trigger': [1, 2], 'job-0': [15, 16, 17]
  }>({});

  // 현재 포커스된 요소 상태
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  // 섹션 순서 관리 (드래그 앤 드롭용)
  const [sectionOrder, setSectionOrder] = useState([
    'workflow-name',
    'triggers', 
    'jobs'
    // 'yaml-content' 제거 - 기본적으로 숨김
  ]);

  // 드래그 중인 섹션
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // 드래그 오버 중인 드롭 영역
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // 고급 모드 상태 (YAML Content 섹션 표시 여부)
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // 섹션 추가 드롭다운 상태
  const [showAddSectionDropdown, setShowAddSectionDropdown] = useState(false);

  // Job 드롭다운 상태
  const [jobDropdowns, setJobDropdowns] = useState<{ [key: number]: boolean }>({});

  // 사용 가능한 섹션 템플릿들
  const [availableSections] = useState([
    { 
      id: 'env', 
      name: 'Environment Variables', 
      template: 'env:\n  NODE_ENV: production\n  DEBUG: false',
      type: 'env',
      fields: {
        variables: [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'DEBUG', value: 'false' }
        ]
      }
    },
    { 
      id: 'permissions', 
      name: 'Permissions', 
      template: 'permissions:\n  contents: read\n  pull-requests: write',
      type: 'permissions',
      fields: {
        contents: 'read',
        pullRequests: 'write',
        actions: 'read',
        checks: 'write',
        deployments: 'write',
        issues: 'write',
        packages: 'write',
        pages: 'write',
        securityEvents: 'write',
        statuses: 'write'
      }
    },
    { 
      id: 'concurrency', 
      name: 'Concurrency', 
      template: 'concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true',
      type: 'concurrency',
      fields: {
        group: '${{ github.workflow }}-${{ github.ref }}',
        cancelInProgress: true
      }
    },
    { 
      id: 'defaults', 
      name: 'Defaults', 
      template: 'defaults:\n  run:\n    shell: bash',
      type: 'defaults',
      fields: {
        shell: 'bash',
        workingDirectory: ''
      }
    },
    { 
      id: 'timeout', 
      name: 'Timeout', 
      template: 'timeout-minutes: 30',
      type: 'timeout',
      fields: {
        minutes: 30
      }
    },
    { 
      id: 'strategy', 
      name: 'Strategy', 
      template: 'strategy:\n  matrix:\n    node-version: [16, 18, 20]\n    os: [ubuntu-latest, windows-latest]',
      type: 'strategy',
      fields: {
        matrix: {
          nodeVersion: ['16', '18', '20'],
          os: ['ubuntu-latest', 'windows-latest']
        }
      }
    }
  ]);

  // 동적 섹션 상태 관리
  const [dynamicSections, setDynamicSections] = useState<{[key: string]: any}>({});

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

  // YAML 내용을 workflowContent에 반영
  useEffect(() => {
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowName, workflowTriggers, jobs, dynamicSections, isAdvancedMode, sectionOrder]);

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

  // 드래그 앤 드롭 관련 함수들
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', sectionId);
  };

  const handleDragOver = (e: React.DragEvent, zoneId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 드롭 영역에 드래그 오버 중일 때 상태 업데이트
    if (zoneId && draggedSection) {
      setDragOverZone(zoneId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 드래그가 드롭 영역을 벗어날 때 상태 초기화
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    
    if (!draggedSection) {
      setDraggedSection(null);
      return;
    }

    // workflow-name은 drag&drop 대상에서 제외
    if (draggedSection === 'workflow-name') {
      setDraggedSection(null);
      setDragOverZone(null);
      return;
    }

    // 본인한테 드롭하는 경우 아무것도 하지 않음
    if (draggedSection === targetSectionId) {
      setDraggedSection(null);
      setDragOverZone(null);
      return;
    }

    // 드롭 위치에 따른 섹션 순서 재배열
    const newOrder = [...sectionOrder];
    const draggedIndex = newOrder.indexOf(draggedSection);
    
    // 드래그된 섹션을 먼저 제거
    newOrder.splice(draggedIndex, 1);
    
    switch (targetSectionId) {
      case 'top':
        // workflow-name 다음으로 이동 (맨 위가 아님)
        const workflowNameIndex = newOrder.indexOf('workflow-name');
        newOrder.splice(workflowNameIndex + 1, 0, draggedSection);
        break;
      case 'bottom':
        // 맨 아래로 이동
        newOrder.push(draggedSection);
        break;
      case 'after-workflow-name':
        // Workflow Name 다음으로 이동
        const workflowNameIndex2 = newOrder.indexOf('workflow-name');
        newOrder.splice(workflowNameIndex2 + 1, 0, draggedSection);
        break;
      case 'after-triggers':
        // Triggers 다음으로 이동
        const triggersIndex = newOrder.indexOf('triggers');
        newOrder.splice(triggersIndex + 1, 0, draggedSection);
        break;
      case 'after-jobs':
        // Jobs 다음으로 이동
        const jobsIndex = newOrder.indexOf('jobs');
        newOrder.splice(jobsIndex + 1, 0, draggedSection);
        break;
      default:
        // 기존 섹션 위에 드롭한 경우
        if (newOrder.includes(targetSectionId)) {
          const targetIndex = newOrder.indexOf(targetSectionId);
          newOrder.splice(targetIndex, 0, draggedSection);
        }
        break;
    }
    
    setSectionOrder(newOrder);
    setDraggedSection(null);
    setDragOverZone(null);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverZone(null);
  };

  // 섹션 삭제 함수
  const deleteSection = (sectionId: string) => {
    if (sectionId === 'workflow-name' || sectionId === 'yaml-content') {
      alert('워크플로우 이름과 YAML 콘텐츠는 삭제할 수 없습니다.');
      return;
    }
    
    const newOrder = sectionOrder.filter(id => id !== sectionId);
    setSectionOrder(newOrder);
  };

  // 섹션 추가 함수
  const addSection = (sectionTemplate: typeof availableSections[0]) => {
    const newSectionId = `${sectionTemplate.id}-${Date.now()}`;
    const newOrder = [...sectionOrder, newSectionId];
    
    console.log('🔧 섹션 추가:', {
      sectionTemplate,
      newSectionId,
      newOrder,
      currentSectionOrder: sectionOrder
    });
    
    setSectionOrder(newOrder);
    
    // 동적 섹션 상태 초기화
    setDynamicSections(prev => {
      const newSections = {
        ...prev,
        [newSectionId]: { ...sectionTemplate.fields }
      };
      
      console.log('🔧 동적 섹션 상태 업데이트:', {
        prev,
        newSections,
        newSectionId,
        sectionData: newSections[newSectionId]
      });
      
      return newSections;
    });
    
    // 드롭다운 닫기
    setShowAddSectionDropdown(false);
  };

  // 섹션 추가 드롭다운 토글
  const toggleAddSectionDropdown = () => {
    setShowAddSectionDropdown(!showAddSectionDropdown);
  };

  // 고급 모드 토글 함수
  const toggleAdvancedMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
    
    if (!isAdvancedMode) {
      // 고급 모드 활성화 시 YAML Content 섹션을 맨 마지막에 추가
      setSectionOrder(prev => [...prev, 'yaml-content']);
    } else {
      // 고급 모드 비활성화 시 YAML Content 섹션 제거
      setSectionOrder(prev => prev.filter(id => id !== 'yaml-content'));
    }
  };

  // 섹션 렌더링 함수
  const renderSection = (sectionId: string) => {
    // 개별 요소별 focus 관리 (section 전체가 아닌)
    
    switch (sectionId) {
      case 'workflow-name':
        return (
          <div className="workflow-section workflow-name-section">
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
                onFocus={() => handleInputFocus('workflow-name')}
                onBlur={handleInputBlur}
              />
            </div>
          </div>
        );

      case 'triggers':
        return (
          <div 
            className={`workflow-section ${draggedSection === sectionId ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, sectionId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, sectionId)}
            onDragEnd={handleDragEnd}
          >
            {/* 드래그 핸들 */}
            <div className="drag-handle">
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
            </div>
            
            <div className="section-header">
              <h2 className="section-title">Triggers</h2>
              <button className="delete-section-btn" onClick={() => deleteSection(sectionId)}>Delete</button>
            </div>
            <div className="section-content">
              {/* Push Trigger */}
              <div className="trigger-item">
                <div className="trigger-header" onClick={() => toggleMainPanelDropdown('push-trigger')}>
                  <label className="trigger-checkbox">
                    <input
                      type="checkbox"
                      checked={workflowTriggers.push.enabled}
                      onChange={(e) => updateWorkflowTrigger('push', 'enabled', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="trigger-name">Push</span>
                  <span className={`dropdown-arrow ${mainPanelDropdowns['push-trigger'] ? 'open' : ''}`}>
                    ▼
                  </span>
                </div>
                {mainPanelDropdowns['push-trigger'] && workflowTriggers.push.enabled && (
                  <div className="trigger-details">
                    <div className="field-group">
                      <label>Branches:</label>
                      <input
                        type="text"
                        value={workflowTriggers.push.branches.join(', ')}
                        onChange={(e) => updateWorkflowTrigger('push', 'branches', e.target.value.split(', '))}
                        placeholder="main, develop"
                        onFocus={() => handleInputFocus('push-trigger-branches')}
                        onBlur={handleInputBlur}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pull Request Trigger */}
              <div className="trigger-item">
                <div className="trigger-header" onClick={() => toggleMainPanelDropdown('pr-trigger')}>
                  <label className="trigger-checkbox">
                    <input 
                      type="checkbox" 
                      checked={workflowTriggers.pull_request.enabled} 
                      onChange={(e) => updateWorkflowTrigger('pull_request', 'enabled', e.target.checked)}
                      onFocus={() => handleInputFocus('pull-request')}
                      onBlur={handleInputBlur}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="trigger-name">Pull Request</span>
                  <span className={`dropdown-arrow ${mainPanelDropdowns['pr-trigger'] ? 'open' : ''}`}>
                    ▼
                  </span>
                </div>
                {mainPanelDropdowns['pr-trigger'] && workflowTriggers.pull_request.enabled && (
                  <div className="trigger-details">
                    <div className="field-group">
                      <label>Types:</label>
                      <div className="pr-types-buttons">
                        <button
                          type="button"
                          className={`pr-type-btn ${workflowTriggers.pull_request.types.includes('opened') ? 'active' : ''}`}
                          onClick={() => updateWorkflowTrigger('pull_request', 'types', ['opened'])}
                          onFocus={() => handleInputFocus('pr-types')}
                          onBlur={handleInputBlur}
                        >
                          Opened
                        </button>
                        <button
                          type="button"
                          className={`pr-type-btn ${workflowTriggers.pull_request.types.includes('synchronize') ? 'active' : ''}`}
                          onClick={() => updateWorkflowTrigger('pull_request', 'types', ['synchronize'])}
                          onFocus={() => handleInputFocus('pr-types')}
                          onBlur={handleInputBlur}
                        >
                          Synchronize
                        </button>
                        <button
                          type="button"
                          className={`pr-type-btn ${workflowTriggers.pull_request.types.includes('reopened') ? 'active' : ''}`}
                          onClick={() => updateWorkflowTrigger('pull_request', 'types', ['reopened'])}
                          onFocus={() => handleInputFocus('pr-types')}
                          onBlur={handleInputBlur}
                        >
                          Reopened
                        </button>
                      </div>
                    </div>
                    <div className="field-group">
                      <label>Branches:</label>
                      <input
                        type="text"
                        value={workflowTriggers.pull_request.branches.join(', ')}
                        onChange={(e) => updateWorkflowTrigger('pull_request', 'branches', e.target.value.split(', '))}
                        placeholder="main, develop"
                        onFocus={() => handleInputFocus('pr-branches')}
                        onBlur={handleInputBlur}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'jobs':
        return (
          <div 
            className={`workflow-section ${draggedSection === sectionId ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, sectionId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, sectionId)}
            onDragEnd={handleDragEnd}
          >
            {/* 드래그 핸들 */}
            <div className="drag-handle">
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
              <div className="drag-handle-dots">
                <div className="drag-handle-dot"></div>
                <div className="drag-handle-dot"></div>
              </div>
            </div>
            
            <div className="section-header">
              <h2 className="section-title">Jobs</h2>
              <div className="section-actions">
                <button className="add-job-btn" onClick={addJob}>+ Add Job</button>
                <button className="delete-section-btn" onClick={() => deleteSection(sectionId)}>Delete</button>
              </div>
            </div>
            <div className="section-content">
              {jobs.map((job, index) => (
                <div key={index} className="job-item">
                  <div className="job-header" onClick={() => toggleJobDropdown(index)}>
                    <span className="job-name">{job.name}</span>
                    <span className={`dropdown-arrow ${jobDropdowns[index] ? 'open' : ''}`}>
                      ▼
                    </span>
                  </div>
                  {jobDropdowns[index] && (
                    <div className="job-details">
                      <div className="field-group">
                        <label>Runs on:</label>
                        <input
                          type="text"
                          value={job.runsOn.join(', ')}
                          onChange={(e) => updateJob(index, 'runsOn', e.target.value.split(', '))}
                          placeholder="ubuntu-latest, windows-latest"
                          onFocus={() => handleInputFocus(`job-${index}-runs-on`)}
                          onBlur={handleInputBlur}
                        />
                      </div>
                      <div className="field-group">
                        <label>Steps:</label>
                        {job.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="step-item">
                            <input
                              type="text"
                              value={step.name || ''}
                              onChange={(e) => updateJobStep(index, stepIndex, 'name', e.target.value)}
                              placeholder="Step name (optional)"
                              onFocus={() => handleInputFocus(`job-${index}-step-${stepIndex}-name`)}
                              onBlur={handleInputBlur}
                            />
                            <input
                              type="text"
                              value={step.uses || ''}
                              onChange={(e) => updateJobStep(index, stepIndex, 'uses', e.target.value)}
                              placeholder="Action (e.g., actions/checkout@v4)"
                              onFocus={() => handleInputFocus(`job-${index}-step-${stepIndex}-uses`)}
                              onBlur={handleInputBlur}
                            />
                            <input
                              type="text"
                              value={step.run || ''}
                              onChange={(e) => updateJobStep(index, stepIndex, 'run', e.target.value)}
                              placeholder="Command to run"
                              onFocus={() => handleInputFocus(`job-${index}-step-${stepIndex}-run`)}
                              onBlur={handleInputBlur}
                            />
                          </div>
                        ))}
                        <button className="add-job-btn" onClick={() => addJobStep(index)}>
                          + Add Step
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'yaml-content':
        if (!isAdvancedMode) return null;
        return (
          <>
            <div className="workflow-section yaml-content-section">
              <div className="section-header">
                <h2 className="section-title">YAML Content</h2>
                <div className="advanced-warning">
                  <span className="yaml-warning">⚠️ Advanced Mode</span>
                </div>
              </div>
              <div className="advanced-warning">
                <div className="warning-title">⚠️ Advanced Mode Warning</div>
                <div className="warning-content">Direct YAML editing may cause syntax errors. Use the form-based editor above for safer workflow creation.</div>
              </div>
              <div className="section-content">
                <textarea
                  className="yaml-editor-textarea"
                  value={workflowContent}
                  onChange={(e) => handleWorkflowContentChange(e.target.value)}
                  placeholder="Enter custom YAML content..."
                />
              </div>
            </div>
          </>
        );

      default:
        // 동적 섹션들 렌더링
        // sectionId에서 타임스탬프를 제거하고 원본 id 찾기
        const baseSectionId = sectionId.includes('-') ? sectionId.split('-').slice(0, -1).join('-') : sectionId;
        const sectionTemplate = availableSections.find(s => s.id === baseSectionId);
        
        if (sectionTemplate) {
          return (
            <div 
              className={`workflow-section ${draggedSection === sectionId ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, sectionId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, sectionId)}
              onDragEnd={handleDragEnd}
            >
              {/* 드래그 핸들 */}
              <div className="drag-handle">
                <div className="drag-handle-dots">
                  <div className="drag-handle-dot"></div>
                  <div className="drag-handle-dot"></div>
                </div>
                <div className="drag-handle-dots">
                  <div className="drag-handle-dot"></div>
                  <div className="drag-handle-dot"></div>
                </div>
                <div className="drag-handle-dots">
                  <div className="drag-handle-dot"></div>
                  <div className="drag-handle-dot"></div>
                </div>
              </div>
              
              <div className="section-header">
                <h2 className="section-title">{sectionTemplate.name}</h2>
                <button className="delete-section-btn" onClick={() => deleteSection(sectionId)}>Delete</button>
              </div>
              <div className="section-content">
                {renderDynamicSection(sectionTemplate, sectionId)}
              </div>
            </div>
          );
        }
        
        return null;
    }
  };

  // FE/sungwon의 정교한 UI를 위한 함수들
  const toggleMainPanelDropdown = (dropdownKey: string) => {
    setMainPanelDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));

    // 하이라이트 업데이트 - dropdownKey에서 section과 elementType 추출
    let sectionId: string;
    let elementType: string;
    
    if (dropdownKey === 'push-trigger') {
      sectionId = 'triggers';
      elementType = 'push';
    } else if (dropdownKey === 'pr-trigger') {
      sectionId = 'triggers';
      elementType = 'pull-request';
    } else {
      // 기본값
      sectionId = 'triggers';
      elementType = dropdownKey;
    }
    
    updateHighlightedLines(sectionId, elementType);
  };

  // 포커스 이벤트 핸들러들
  const handleInputFocus = (inputKey: string) => {
    setFocusedElement(inputKey);
    
    // inputKey에서 section ID와 요소 타입 추출
    let sectionId: string | null = null;
    let elementType: string | null = null;
    
    // 특별한 경우들 처리
    if (inputKey === 'workflow-name') {
      sectionId = 'workflow-name';
      elementType = 'name';
    } else if (inputKey === 'pr-types') {
      sectionId = 'triggers';
      elementType = 'pr-types';
    } else if (inputKey === 'pr-branches') {
      sectionId = 'triggers';
      elementType = 'pr-branches';
    } else if (inputKey === 'push-branches') {
      sectionId = 'triggers';
      elementType = 'push-branches';
    } else if (inputKey.startsWith('job-') && inputKey.includes('-runs-on')) {
      sectionId = 'jobs';
      elementType = inputKey;
    } else if (inputKey.startsWith('job-') && inputKey.includes('-step-')) {
      sectionId = 'jobs';
      elementType = inputKey;
    } else if (inputKey.startsWith('job-')) {
      sectionId = 'jobs';
      elementType = inputKey;
    } else if (inputKey.includes('-')) {
      // 동적 섹션의 경우 (예: env-1234567890)
      const baseSectionId = inputKey.split('-').slice(0, -1).join('-');
      sectionId = sectionOrder.find(id => id.startsWith(baseSectionId)) || null;
      elementType = baseSectionId;
    }
    
    console.log('🎯 Focused Element:', { inputKey, sectionId, elementType });
    
    if (sectionId && elementType) {
      updateHighlightedLines(sectionId, elementType);
    }
  };

  const handleInputBlur = () => {
    setFocusedElement(null);
    setHighlightedLines({});
  };

  // TODO: 드롭다운 포커스 로직 구현 예정
  // const handleDropdownFocus = (dropdownKey: string) => {
  //   setFocusedElement(dropdownKey);
  //   updateHighlightedLines(dropdownKey);
  // };

  // TODO: 드롭다운 블러 로직 구현 예정
  // const handleDropdownBlur = () => {
  //   setFocusedElement(null);
  //   setHighlightedLines({});
  // };

  const updateWorkflowTrigger = (trigger: 'push' | 'pull_request', field: string, value: any) => {
    console.log('🔄 updateWorkflowTrigger 호출됨:', { trigger, field, value });
    console.log('🔄 업데이트 전 workflowTriggers:', workflowTriggers);
    
    setWorkflowTriggers(prev => {
      const newTriggers = {
        ...prev,
        [trigger]: {
          ...prev[trigger],
          [field]: value
        }
      };
      console.log('🔄 업데이트 후 workflowTriggers:', newTriggers);
      return newTriggers;
    });

    // YAML 업데이트 - 무한 루프 방지를 위해 직접 generateYaml 호출
    const generatedYaml = generateYaml();
    console.log('🔄 생성된 YAML:', generatedYaml);
    setWorkflowContent(generatedYaml);
  };

  const updateJob = (jobIndex: number, field: string, value: any) => {
    const newJobs = [...jobs];
    newJobs[jobIndex] = {
      ...newJobs[jobIndex],
      [field]: value
    };
    setJobs(newJobs);

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  const updateJobStep = (jobIndex: number, stepIndex: number, field: string, value: any) => {
    const newJobs = [...jobs];
    newJobs[jobIndex].steps[stepIndex] = {
      ...newJobs[jobIndex].steps[stepIndex],
      [field]: value
    };
    setJobs(newJobs);

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  const addJobStep = (jobIndex: number) => {
    const newJobs = [...jobs];
    newJobs[jobIndex].steps.push({ name: '', uses: '', run: '' } as any);
    setJobs(newJobs);

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  // 하이라이트 라인 업데이트 함수
  const updateHighlightedLines = (sectionId: string, elementType: string) => {
    console.log('🎨 updateHighlightedLines 호출됨:', { sectionId, elementType });
    const lines = findYamlLinesForDropdown(sectionId, elementType);
    console.log('📊 찾은 라인들:', lines);
    
    // 기존 하이라이트를 유지하면서 새로운 하이라이트 추가
    setHighlightedLines(prev => ({
      ...prev,
      [sectionId]: lines
    }));
  };

  // YAML 라인 찾기 함수 (실제 YAML 구조 기반)
  const findYamlLinesForDropdown = (sectionId: string, elementType: string): number[] => {
    console.log('🔍 findYamlLinesForDropdown 호출됨:', { sectionId, elementType });
    const lines = workflowContent.split('\n');
    console.log('📄 YAML 라인 수:', lines.length);
    
    const lineMap: { [key: string]: number[] } = {};
    
    // 워크플로우 이름
    if (sectionId === 'workflow-name' && elementType === 'name') {
      const nameLineIndex = lines.findIndex(line => line.startsWith('name:'));
      if (nameLineIndex !== -1) {
        lineMap[sectionId] = [nameLineIndex + 1];
      }
    }
    
    // Push 트리거 드롭다운
    if (sectionId === 'triggers' && elementType === 'push') {
      const onIndex = lines.findIndex(line => line.trim() === 'on:');
      const pushIndex = lines.findIndex(line => line.trim() === 'push:');
      if (onIndex !== -1 && pushIndex !== -1) {
        lineMap[sectionId] = [onIndex + 1, pushIndex + 1];
      }
    }
    
    // Push 트리거 branches 입력
    if (sectionId === 'triggers' && elementType === 'push-branches') {
      const pushIndex = lines.findIndex(line => line.trim() === 'push:');
      const branchesIndex = lines.findIndex(line => line.trim().startsWith('branches:'));
      if (pushIndex !== -1 && branchesIndex !== -1) {
        lineMap[sectionId] = [pushIndex + 1, branchesIndex + 1];
      }
    }
    
    // Pull Request 트리거 드롭다운
    if (sectionId === 'triggers' && elementType === 'pull-request') {
      const onIndex = lines.findIndex(line => line.trim() === 'on:');
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      if (onIndex !== -1 && prIndex !== -1) {
        // pull_request 섹션의 모든 내용을 포함
        const prLines = [onIndex + 1, prIndex + 1];
        for (let i = prIndex + 1; i < lines.length; i++) {
          if (lines[i].trim() === '') break; // 빈 줄까지
          if (lines[i].trim().startsWith('types:') || lines[i].trim().startsWith('branches:') || lines[i].trim().startsWith('paths:')) {
            prLines.push(i + 1);
          }
        }
        lineMap[sectionId] = prLines;
      }
    }
    
    // Pull Request 트리거 types 버튼들
    if (sectionId === 'triggers' && elementType === 'pr-types') {
      const onIndex = lines.findIndex(line => line.trim() === 'on:');
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      const typesIndex = lines.findIndex(line => line.trim().startsWith('types:'));
      if (onIndex !== -1 && prIndex !== -1 && typesIndex !== -1) {
        lineMap[sectionId] = [onIndex + 1, prIndex + 1, typesIndex + 1];
      }
    }
    
    // Pull Request 트리거 branches 입력
    if (sectionId === 'triggers' && elementType === 'pr-branches') {
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      const branchesIndex = lines.findIndex(line => line.trim().startsWith('branches:'));
      if (prIndex !== -1 && branchesIndex !== -1) {
        lineMap[sectionId] = [prIndex + 1, branchesIndex + 1];
      }
    }
    
    // Job 드롭다운
    if (sectionId === 'jobs' && elementType.startsWith('job-')) {
      const jobIndexNum = parseInt(elementType.split('-')[1]);
      const jobName = jobs[jobIndexNum]?.name;
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        if (jobLineIndex !== -1) {
          lineMap[sectionId] = [jobLineIndex + 1];
        }
      }
    }
    
    // Job runs-on 입력
    if (sectionId === 'jobs' && elementType.includes('-runs-on')) {
      const jobIndexNum = parseInt(elementType.split('-')[1]);
      const jobName = jobs[jobIndexNum]?.name;
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        const runsOnIndex = lines.findIndex(line => line.trim().startsWith('runs-on:'));
        if (jobLineIndex !== -1 && runsOnIndex !== -1) {
          lineMap[sectionId] = [jobLineIndex + 1, runsOnIndex + 1];
        }
      }
    }
    
    // Job step 입력
    if (sectionId === 'jobs' && elementType.includes('-step-')) {
      const parts = elementType.split('-');
      const jobIndexNum = parseInt(parts[1]);
      const stepIndexNum = parseInt(parts[3]);
      const jobName = jobs[jobIndexNum]?.name;
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        const stepsIndex = lines.findIndex(line => line.trim() === 'steps:');
        if (jobLineIndex !== -1 && stepsIndex !== -1) {
          // steps 섹션에서 해당 step 찾기
          let stepLineIndex = -1;
          let currentStep = 0;
          for (let i = stepsIndex + 1; i < lines.length; i++) {
            if (lines[i].trim().startsWith('-')) {
              if (currentStep === stepIndexNum) {
                stepLineIndex = i;
                break;
              }
              currentStep++;
            }
          }
          if (stepLineIndex !== -1) {
            lineMap[sectionId] = [jobLineIndex + 1, stepsIndex + 1, stepLineIndex + 1];
          }
        }
      }
    }
    
    // 동적 섹션들 처리
    if (sectionId && sectionId.includes('-')) {
      // 동적 섹션의 경우 (예: env-1234567890)
      const baseSectionId = sectionId.split('-').slice(0, -1).join('-');
      
      if (baseSectionId === 'env') {
        const envIndex = lines.findIndex(line => line.trim() === 'env:');
        if (envIndex !== -1) {
          // env 섹션의 모든 변수들도 포함
          const envLines = [envIndex + 1];
          for (let i = envIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break; // 빈 줄까지
            if (lines[i].trim().includes(':')) {
              envLines.push(i + 1);
            }
          }
          lineMap[sectionId] = envLines;
        }
      } else if (baseSectionId === 'permissions') {
        const permissionsIndex = lines.findIndex(line => line.trim() === 'permissions:');
        if (permissionsIndex !== -1) {
          // permissions 섹션의 모든 권한들도 포함
          const permissionLines = [permissionsIndex + 1];
          for (let i = permissionsIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break; // 빈 줄까지
            if (lines[i].trim().includes(':')) {
              permissionLines.push(i + 1);
            }
          }
          lineMap[sectionId] = permissionLines;
        }
      } else if (baseSectionId === 'concurrency') {
        const concurrencyIndex = lines.findIndex(line => line.trim() === 'concurrency:');
        if (concurrencyIndex !== -1) {
          // concurrency 섹션의 모든 설정들도 포함
          const concurrencyLines = [concurrencyIndex + 1];
          for (let i = concurrencyIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break; // 빈 줄까지
            if (lines[i].trim().includes(':')) {
              concurrencyLines.push(i + 1);
            }
          }
          lineMap[sectionId] = concurrencyLines;
        }
      } else if (baseSectionId === 'defaults') {
        const defaultsIndex = lines.findIndex(line => line.trim() === 'defaults:');
        if (defaultsIndex !== -1) {
          // defaults 섹션의 모든 설정들도 포함
          const defaultsLines = [defaultsIndex + 1];
          for (let i = defaultsIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break; // 빈 줄까지
            if (lines[i].trim().includes(':')) {
              defaultsLines.push(i + 1);
            }
          }
          lineMap[sectionId] = defaultsLines;
        }
      } else if (baseSectionId === 'timeout') {
        const timeoutIndex = lines.findIndex(line => line.trim().startsWith('timeout-minutes:'));
        if (timeoutIndex !== -1) {
          lineMap[sectionId] = [timeoutIndex + 1];
        }
      } else if (baseSectionId === 'strategy') {
        const strategyIndex = lines.findIndex(line => line.trim() === 'strategy:');
        if (strategyIndex !== -1) {
          // strategy 섹션의 모든 설정들도 포함
          const strategyLines = [strategyIndex + 1];
          for (let i = strategyIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break; // 빈 줄까지
            if (lines[i].trim().includes(':')) {
              strategyLines.push(i + 1);
            }
          }
          lineMap[sectionId] = strategyLines;
        }
      }
    }
    
    console.log('🎯 최종 하이라이트 라인:', lineMap[sectionId] || []);
    return lineMap[sectionId] || [];
  };

  // 현재 하이라이트된 라인들 가져오기
  const getHighlightedLines = (): number[] => {
    console.log('📋 getHighlightedLines 호출됨, focusedElement:', focusedElement);
    console.log('🎯 전체 highlightedLines:', highlightedLines);
    
    // 모든 하이라이트된 라인을 하나의 배열로 합치기
    const allHighlightedLines = Object.values(highlightedLines).flat();
    console.log('🔗 합쳐진 하이라이트 라인들:', allHighlightedLines);
    
    return allHighlightedLines;
  };

  const addJob = () => {
    const newJob = {
      name: `job-${jobs.length + 1}`,
      runsOn: ['ubuntu-latest'],
      steps: [
        { name: 'Checkout code', uses: 'actions/checkout@v4' }
      ]
    };
    setJobs([...jobs, newJob]);
  };

  // YAML 생성 함수
  const generateYaml = () => {
    console.log('🔧 generateYaml 호출됨:', {
      sectionOrder,
      dynamicSections,
      availableSections
    });
    
    let yaml = `name: ${workflowName}\n\n`;
    
    // sectionOrder를 기반으로 섹션들을 순서대로 생성
    sectionOrder.forEach(sectionId => {
      console.log('🔧 섹션 처리 중:', sectionId);
      
      if (sectionId === 'workflow-name') {
        // workflow-name은 이미 위에서 처리됨
        return;
      }
      
      if (sectionId === 'triggers') {
        // Triggers
        console.log('🔧 Triggers 섹션 처리 중:', {
          workflowTriggers,
          push: workflowTriggers.push,
          pull_request: workflowTriggers.pull_request
        });
        
        yaml += 'on:\n';
        if (workflowTriggers.push.enabled) {
          console.log('✅ Push 트리거 활성화됨');
          yaml += '  push:\n';
          yaml += `    branches: [${workflowTriggers.push.branches.map(b => `'${b}'`).join(', ')}]\n`;
        }
        if (workflowTriggers.pull_request.enabled) {
          console.log('✅ Pull Request 트리거 활성화됨');
          yaml += '  pull_request:\n';
          yaml += `    types: [${workflowTriggers.pull_request.types.map(t => `'${t}'`).join(', ')}]\n`;
          yaml += `    branches: [${workflowTriggers.pull_request.branches.map(b => `'${b}'`).join(', ')}]\n`;
          if (workflowTriggers.pull_request.paths.length > 0) {
            yaml += `    paths: [${workflowTriggers.pull_request.paths.map(p => `'${p}'`).join(', ')}]\n`;
          }
        }
        yaml += '\n';
        console.log('🔧 생성된 Triggers YAML:', yaml);
        return;
      }
      
      if (sectionId === 'jobs') {
        // Jobs
        jobs.forEach(job => {
          yaml += `${job.name}:\n`;
          yaml += `  runs-on: ${job.runsOn.join(', ')}\n`;
          yaml += '  steps:\n';
          job.steps.forEach(step => {
            yaml += '    - ';
            if (step.name) {
              yaml += `name: ${step.name}\n      `;
            }
            if (step.uses) {
              yaml += `uses: ${step.uses}\n`;
            } else if (step.run) {
              yaml += `run: ${step.run}\n`;
            }
          });
          yaml += '\n';
        });
        return;
      }
      
      if (sectionId === 'yaml-content') {
        // Advanced Mode YAML Content
        if (isAdvancedMode) {
          // yamlContent가 정의되지 않았으므로 주석 처리
          // yaml += yamlContent + '\n';
        }
        return;
      }
      
      // 동적 섹션들 처리
      // sectionId에서 타임스탬프를 제거하고 원본 id 찾기
      const baseSectionId = sectionId.includes('-') ? sectionId.split('-').slice(0, -1).join('-') : sectionId;
      const sectionTemplate = availableSections.find(s => s.id === baseSectionId);
      
      console.log('🔧 동적 섹션 처리:', {
        sectionId,
        baseSectionId,
        sectionTemplate,
        sectionData: dynamicSections[sectionId]
      });
      
      if (sectionTemplate && dynamicSections[sectionId]) {
        const sectionData = dynamicSections[sectionId];
        
        switch (sectionTemplate.type) {
          case 'env':
            yaml += 'env:\n';
            sectionData.variables.forEach((env: any) => {
              if (env.key && env.value) {
                yaml += `  ${env.key}: ${env.value}\n`;
              }
            });
            yaml += '\n';
            break;
            
          case 'permissions':
            yaml += 'permissions:\n';
            if (sectionData.contents && sectionData.contents !== 'none') {
              yaml += `  contents: ${sectionData.contents}\n`;
            }
            if (sectionData.pullRequests && sectionData.pullRequests !== 'none') {
              yaml += `  pull-requests: ${sectionData.pullRequests}\n`;
            }
            yaml += '\n';
            break;
            
          case 'concurrency':
            yaml += 'concurrency:\n';
            if (sectionData.group) {
              yaml += `  group: ${sectionData.group}\n`;
            }
            if (sectionData.cancelInProgress) {
              yaml += '  cancel-in-progress: true\n';
            }
            yaml += '\n';
            break;
            
          case 'defaults':
            yaml += 'defaults:\n';
            if (sectionData.shell) {
              yaml += `  run:\n    shell: ${sectionData.shell}\n`;
            }
            if (sectionData.workingDirectory) {
              yaml += `  run:\n    working-directory: ${sectionData.workingDirectory}\n`;
            }
            yaml += '\n';
            break;
            
          case 'timeout':
            if (sectionData.minutes) {
              yaml += `timeout-minutes: ${sectionData.minutes}\n\n`;
            }
            break;
            
          case 'strategy':
            yaml += 'strategy:\n';
            yaml += '  matrix:\n';
            if (sectionData.matrix.nodeVersion.length > 0) {
              yaml += `    node-version: [${sectionData.matrix.nodeVersion.map((v: string) => `'${v}'`).join(', ')}]\n`;
            }
            if (sectionData.matrix.os.length > 0) {
              yaml += `    os: [${sectionData.matrix.os.map((v: string) => `'${v}'`).join(', ')}]\n`;
            }
            yaml += '\n';
            break;
        }
      }
    });
    
    console.log('🔧 최종 생성된 YAML:', yaml);
    return yaml;
  };

  // 동적 섹션 렌더링 함수
  const renderDynamicSection = (sectionTemplate: typeof availableSections[0], sectionId: string) => {
    const sectionData = dynamicSections[sectionId] || sectionTemplate.fields;

    switch (sectionTemplate.type) {
      case 'env':
        return (
          <div className="env-section">
            <div className="field-group">
              <label>Environment Variables:</label>
              {sectionData.variables.map((env: any, index: number) => (
                <div key={index} className="env-variable">
                  <input
                    type="text"
                    value={env.key}
                    onChange={(e) => {
                      const newSections = { ...dynamicSections };
                      newSections[sectionId].variables[index].key = e.target.value;
                      setDynamicSections(newSections);
                    }}
                    placeholder="Variable name"
                    onFocus={() => handleInputFocus(sectionId)}
                    onBlur={handleInputBlur}
                  />
                  <span>=</span>
                  <input
                    type="text"
                    value={env.value}
                    onChange={(e) => {
                      const newSections = { ...dynamicSections };
                      newSections[sectionId].variables[index].value = e.target.value;
                      setDynamicSections(newSections);
                    }}
                    placeholder="Value"
                    onFocus={() => handleInputFocus(sectionId)}
                    onBlur={handleInputBlur}
                  />
                </div>
              ))}
              <button 
                className="add-env-btn"
                onClick={() => {
                  const newSections = { ...dynamicSections };
                  newSections[sectionId].variables.push({ key: '', value: '' });
                  setDynamicSections(newSections);
                }}
              >
                + Add Variable
              </button>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="permissions-section">
            <div className="field-group">
              <label>Contents:</label>
              <div className="permission-buttons">
                <button
                  type="button"
                  className={`permission-btn ${sectionData.contents === 'read' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].contents = 'read';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Read
                </button>
                <button
                  type="button"
                  className={`permission-btn ${sectionData.contents === 'write' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].contents = 'write';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`permission-btn ${sectionData.contents === 'none' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].contents = 'none';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  None
                </button>
              </div>
            </div>
            <div className="field-group">
              <label>Pull Requests:</label>
              <div className="permission-buttons">
                <button
                  type="button"
                  className={`permission-btn ${sectionData.pullRequests === 'read' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].pullRequests = 'read';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Read
                </button>
                <button
                  type="button"
                  className={`permission-btn ${sectionData.pullRequests === 'write' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].pullRequests = 'write';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`permission-btn ${sectionData.pullRequests === 'none' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].pullRequests = 'none';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  None
                </button>
              </div>
            </div>
          </div>
        );

      case 'concurrency':
        return (
          <div className="concurrency-section">
            <div className="field-group">
              <label>Group:</label>
              <input
                type="text"
                value={sectionData.group}
                onChange={(e) => {
                  const newSections = { ...dynamicSections };
                  newSections[sectionId].group = e.target.value;
                  setDynamicSections(newSections);
                }}
                placeholder="Concurrency group"
                onFocus={() => handleInputFocus(sectionId)}
                onBlur={handleInputBlur}
              />
            </div>
            <div className="field-group">
              <label>Cancel in-progress:</label>
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id={`cancel-${sectionId}`}
                  checked={sectionData.cancelInProgress}
                  onChange={(e) => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].cancelInProgress = e.target.checked;
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                />
                <label htmlFor={`cancel-${sectionId}`} className="checkbox-label">
                  Cancel in-progress jobs when a new workflow run is triggered
                </label>
              </div>
            </div>
          </div>
        );

      case 'defaults':
        return (
          <div className="defaults-section">
            <div className="field-group">
              <label>Shell:</label>
              <div className="shell-buttons">
                <button
                  type="button"
                  className={`shell-btn ${sectionData.shell === 'bash' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].shell = 'bash';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Bash
                </button>
                <button
                  type="button"
                  className={`shell-btn ${sectionData.shell === 'pwsh' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].shell = 'pwsh';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  PowerShell
                </button>
                <button
                  type="button"
                  className={`shell-btn ${sectionData.shell === 'python' ? 'active' : ''}`}
                  onClick={() => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].shell = 'python';
                    setDynamicSections(newSections);
                  }}
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                >
                  Python
                </button>
              </div>
            </div>
            <div className="field-group">
              <label>Working Directory:</label>
              <input
                type="text"
                value={sectionData.workingDirectory}
                onChange={(e) => {
                  const newSections = { ...dynamicSections };
                  newSections[sectionId].workingDirectory = e.target.value;
                  setDynamicSections(newSections);
                }}
                placeholder="Working directory (optional)"
                onFocus={() => handleInputFocus(sectionId)}
                onBlur={handleInputBlur}
              />
            </div>
          </div>
        );

      case 'timeout':
        return (
          <div className="timeout-section">
            <div className="field-group">
              <label>Timeout (minutes):</label>
              <input
                type="number"
                value={sectionData.minutes}
                onChange={(e) => {
                  const newSections = { ...dynamicSections };
                  newSections[sectionId].minutes = parseInt(e.target.value);
                  setDynamicSections(newSections);
                }}
                min="1"
                max="1440"
                placeholder="30"
                onFocus={() => handleInputFocus(sectionId)}
                onBlur={handleInputBlur}
              />
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="strategy-section">
            <div className="field-group">
              <label>Node.js Versions:</label>
              <div className="matrix-input-wrapper">
                <input
                  type="text"
                  value={sectionData.matrix.nodeVersion.join(', ')}
                  onChange={(e) => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].matrix.nodeVersion = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                    setDynamicSections(newSections);
                  }}
                  placeholder="16, 18, 20"
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                />
                <small className="input-hint">쉼표로 구분하여 입력하세요</small>
              </div>
            </div>
            <div className="field-group">
              <label>Operating Systems:</label>
              <div className="matrix-input-wrapper">
                <input
                  type="text"
                  value={sectionData.matrix.os.join(', ')}
                  onChange={(e) => {
                    const newSections = { ...dynamicSections };
                    newSections[sectionId].matrix.os = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                    setDynamicSections(newSections);
                  }}
                  placeholder="ubuntu-latest, windows-latest"
                  onFocus={() => handleInputFocus(sectionId)}
                  onBlur={handleInputBlur}
                />
                <small className="input-hint">쉼표로 구분하여 입력하세요</small>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="template-content">
            <pre>{sectionTemplate.template}</pre>
          </div>
        );
    }
  };

  // Job 드롭다운 토글 함수
  const toggleJobDropdown = (jobIndex: number) => {
    setJobDropdowns(prev => ({
      ...prev,
      [jobIndex]: !prev[jobIndex]
    }));
  };

  // --- Render ---
  if (!actionId) {
    return (
      <div className="editor-main-content">
        <div className="llm-analysis-empty">
          <p className="llm-empty-text">워크플로우를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="editor-main-content">
        <div className="llm-analysis-empty">
          <div className="llm-loading-spinner"></div>
          <p className="llm-empty-text">워크플로우를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="editor-main">
        <div className="main-header">
          <div className="header-left">
            <h1 className="main-title">Workflow Editor</h1>
          </div>
        </div>

        {/* 구분선 아래 컨트롤 영역 */}
        <div className="editor-controls">
          <div className="controls-left">
            <div className="advanced-mode-control">
              <span className="advanced-mode-text">Advanced Mode</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isAdvancedMode}
                  onChange={toggleAdvancedMode}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div className="controls-right">
            <button 
              className="workflow-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Workflow Editor */}
        <div className="workflow-editor">
          {/* 섹션들을 순서대로 렌더링 */}
          {sectionOrder.map((sectionId, index) => (
            <React.Fragment key={sectionId}>
              {/* 섹션 렌더링 */}
              {renderSection(sectionId)}
              
              {/* 섹션 사이 드롭 영역 (workflow-name은 제외하고, 마지막 섹션이 아닌 경우에만) */}
              {sectionId !== 'workflow-name' && index < sectionOrder.length - 1 && (
                <div 
                  className={`drop-zone ${dragOverZone === `after-${sectionId}` ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, `after-${sectionId}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, `after-${sectionId}`)}
                ></div>
              )}
              
              {/* workflow-name 다음에만 맨 위 드롭 영역 추가 */}
              {sectionId === 'workflow-name' && (
                <div 
                  className={`drop-zone drop-zone-top ${dragOverZone === 'top' ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'top')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'top')}
                ></div>
              )}
            </React.Fragment>
          ))}

          {/* 맨 아래 드롭 영역 */}
          <div 
            className={`drop-zone drop-zone-bottom ${dragOverZone === 'bottom' ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'bottom')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'bottom')}
          ></div>

          {/* 섹션 추가 영역 */}
          <div className="add-section-area">
            <button 
              className="add-section-trigger"
              onClick={toggleAddSectionDropdown}
            >
              <span className="add-section-icon">+</span>
              <span className="add-section-text">Add section</span>
              <span className={`dropdown-arrow ${showAddSectionDropdown ? 'open' : ''}`}>
                ▼
              </span>
            </button>
            
            {showAddSectionDropdown && (
              <div className="add-section-dropdown">
                <div className="add-section-header">
                  <span>섹션 추가</span>
                </div>
                <div className="add-section-list">
                  {availableSections.map((section) => (
                    <div
                      key={section.id}
                      className="add-section-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify(section));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => addSection(section)}
                    >
                      <div className="section-item-icon">+</div>
                      <div className="section-item-content">
                        <div className="section-item-name">{section.name}</div>
                        <div className="section-item-desc">{section.template.split('\n')[0]}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right YAML Preview */}
      <div className="yaml-viewer-container">
        <YamlViewer 
          yamlContent={workflowContent} 
          highlightedLines={getHighlightedLines()} // 하이라이트된 라인 전달
        />
      </div>
    </div>
  );
};

export default Editor;