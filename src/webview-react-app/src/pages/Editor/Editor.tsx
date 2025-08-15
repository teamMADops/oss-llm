import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar';
import YamlViewer from './YamlViewer';
import './Editor.css';

interface Action {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running';
}

interface EditorProps {
  actionId: string | null;
}

const Editor: React.FC<EditorProps> = ({ actionId }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [dropdownStates, setDropdownStates] = useState<{
    [key: string]: {
      isOpen: boolean;
      selectedItem: string | null;
    };
  }>({});
  const [workflowContent, setWorkflowContent] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 메인 패널 YAML 구조 상태
  const [workflowName, setWorkflowName] = useState<string>('CI/CD Workflow');
  const [workflowTriggers, setWorkflowTriggers] = useState<{
    push: { branches: string[]; enabled: boolean };
    pull_request: { 
      types: string[]; 
      branches: string[]; 
      paths: string[];
      enabled: boolean;
    };
  }>({
    push: { branches: ['main'], enabled: true },
    pull_request: { 
      types: ['opened', 'synchronize'], 
      branches: ['main'], 
      paths: [],
      enabled: false 
    }
  });
  const [jobs, setJobs] = useState<Array<{
    name: string;
    runsOn: string[];
    steps: Array<{
      name?: string;
      run?: string;
      uses?: string;
    }>;
  }>>([
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

  console.log('Editor 컴포넌트 렌더링됨, actionId:', actionId);

  // Mock Actions 데이터
  const actions: Action[] = [
    { id: 'action1', name: 'Action one_happy', status: 'success' },
    { id: 'action2', name: 'Action twooo', status: 'failed' },
    { id: 'action3', name: 'Action three', status: 'running' },
    { id: 'action4', name: 'Action four', status: 'success' },
    { id: 'action5', name: 'Action five', status: 'failed' }
  ];

  useEffect(() => {
    console.log('Editor useEffect 실행됨, actionId:', actionId);
    if (actionId) {
      setSelectedAction(actionId);
      // Mock workflow content - 더 길고 다양한 YAML 구문 포함
      setWorkflowContent(`# GitHub Actions Workflow Example
# This is a comprehensive workflow for a Node.js application

name: Full CI/CD Workflow Example
description: "Build, test, and deploy Node.js application"

on:
  push:
    branches: [main, develop, feature/*]
    tags: [v*]
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight
  release:
    types: [published]

env:
  NODE_VERSION: '20'
  NPM_VERSION: '10'
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

permissions:
  contents: read
  packages: write
  security-events: write
  actions: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        token: \${{ secrets.GITHUB_TOKEN }}
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        registry-url: \${{ env.REGISTRY }}
    
    - name: Install dependencies
      run: |
        npm ci --prefer-offline --no-audit
        npm audit --audit-level=moderate || true
    
    - name: Run ESLint
      run: npm run lint:check
    
    - name: Run Prettier check
      run: npm run format:check
    
    - name: Check TypeScript types
      run: npm run type-check

  test:
    name: Run Tests
    runs-on: \${{ matrix.os }}
    needs: lint
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20, 22]
        test-type: [unit, integration, e2e]
    
    timeout-minutes: 15
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run \${{ matrix.test-type }} tests
      run: |
        npm run test:\${{ matrix.test-type }}
        npm run test:coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        token: \${{ secrets.CODECOV_TOKEN }}
        file: ./coverage/lcov.info
        flags: \${{ matrix.test-type }}
        name: \${{ matrix.os }}-\${{ matrix.node-version }}-\${{ matrix.test-type }}

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, test]
    outputs:
      build-id: \${{ steps.build.outputs.build-id }}
      build-url: \${{ steps.build.outputs.build-url }}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        registry-url: \${{ env.REGISTRY }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      id: build
      run: |
        npm run build
        echo "build-id=$(date +%s)" >> $GITHUB_OUTPUT
        echo "build-url=\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}" >> $GITHUB_OUTPUT
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-\${{ steps.build.outputs.build-id }}
        path: |
          dist/
          build/
        retention-days: 30

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, security]
    environment: staging
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Add your deployment logic here
        echo "Staging deployment completed"
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: 'Staging deployment successful!'
      env:
        SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, security]
    environment: production
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
    - name: Deploy to production
      run: |
        echo "Deploying to production environment..."
        # Add your production deployment logic here
        echo "Production deployment completed"
    
    - name: Create release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: v\${{ github.run_number }}
        release_name: Release v\${{ github.run_number }}
        body: |
          Production deployment completed successfully
          Build ID: \${{ needs.build.outputs.build-id }}
          Commit: \${{ github.sha }}
        draft: false
        prerelease: false`);
    }
  }, [actionId]);

  const handleActionSelect = (actionId: string) => {
    console.log('Action 클릭됨:', actionId);
    console.log('현재 selectedAction:', selectedAction);
    
    // 이미 선택된 action을 다시 클릭하면 dropdown 토글 (선택 상태는 유지)
    if (selectedAction === actionId) {
      const currentDropdownState = dropdownStates[actionId];
      const isCurrentlyOpen = currentDropdownState?.isOpen || false;
      
      setDropdownStates(prev => ({
        ...prev,
        [actionId]: {
          ...prev[actionId],
          isOpen: !isCurrentlyOpen // 현재 상태의 반대로 토글
        }
      }));
      return;
    }
    
    // 다른 action을 클릭하는 경우
    const newSelectedAction = actionId;
    console.log('새로운 selectedAction:', newSelectedAction);
    setSelectedAction(newSelectedAction);
    
    // 다른 action이 선택되면 해당 action의 dropdown만 열고, 나머지는 모두 초기화
    setDropdownStates(prev => {
      const newStates: { [key: string]: { isOpen: boolean; selectedItem: string | null } } = {};
      
      // 모든 action의 dropdown을 닫고 선택 상태 초기화
      Object.keys(prev).forEach(key => {
        newStates[key] = { isOpen: false, selectedItem: null };
      });
      
      // 선택된 action만 dropdown 열기
      newStates[actionId] = { isOpen: true, selectedItem: null };
      
      return newStates;
    });
  };

  const handleDropdownItemSelect = (actionId: string, itemType: string) => {
    console.log('Dropdown item 클릭됨:', actionId, itemType);
    
    setDropdownStates(prev => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        selectedItem: prev[actionId]?.selectedItem === itemType ? null : itemType
      }
    }));
    
    // Dropdown item 클릭 시 action의 selected 상태만 해제 (색상 해제)
    // dropdown은 계속 표시되도록 isOpen 상태는 유지
    setSelectedAction(null);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // 메인 패널 dropdown 토글 함수들
  const toggleMainPanelDropdown = (dropdownKey: string) => {
    setMainPanelDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));

    // 하이라이트 업데이트
    updateHighlightedLines(dropdownKey);
  };

  // 포커스 이벤트 핸들러들
  const handleInputFocus = (elementKey: string) => {
    setFocusedElement(elementKey);
    updateHighlightedLines(elementKey);
  };

  const handleInputBlur = () => {
    setFocusedElement(null);
    clearAllHighlights();
  };

  const handleDropdownFocus = (dropdownKey: string) => {
    setFocusedElement(dropdownKey);
    updateHighlightedLines(dropdownKey);
  };

  const handleDropdownBlur = () => {
    setFocusedElement(null);
    clearAllHighlights();
  };

  // 하이라이트 라인 업데이트
  const updateHighlightedLines = (elementKey: string) => {
    // 이전 하이라이트 모두 제거
    clearAllHighlights();
    
    // 현재 포커스된 요소만 하이라이트
    const linesToHighlight = findYamlLinesForDropdown(elementKey);
    
    setHighlightedLines({
      [elementKey]: linesToHighlight
    });
  };

  // 모든 하이라이트 제거
  const clearAllHighlights = () => {
    setHighlightedLines({});
  };

  // YAML 내용을 workflowContent에 반영
  useEffect(() => {
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  }, [workflowName, workflowTriggers, jobs]);

  // 하이라이트된 라인들을 YAML 뷰어에 전달
  const getHighlightedLines = () => {
    // 현재 포커스된 요소가 없으면 하이라이트 없음
    if (!focusedElement) return [];
    
    return highlightedLines[focusedElement] || [];
  };

  const updateWorkflowName = (name: string) => {
    setWorkflowName(name);
  };

  const updateWorkflowTrigger = (trigger: 'push' | 'pull_request', field: string, value: any) => {
    setWorkflowTriggers(prev => ({
      ...prev,
      [trigger]: {
        ...prev[trigger],
        [field]: value
      }
    }));
  };

  const addJob = () => {
    setJobs(prev => [...prev, {
      name: `job-${prev.length + 1}`,
      runsOn: ['ubuntu-latest'],
      steps: []
    }]);
  };

  const updateJob = (jobIndex: number, field: string, value: any) => {
    setJobs(prev => prev.map((job, index) => 
      index === jobIndex ? { ...job, [field]: value } : job
    ));
  };

  const addStep = (jobIndex: number) => {
    setJobs(prev => prev.map((job, index) => 
      index === jobIndex 
        ? { ...job, steps: [...job.steps, { name: '', run: '', uses: '' }] }
        : job
    ));
  };

  // YAML 생성 함수
  const generateYaml = () => {
    let yaml = '';
    let lineNumber = 1;

    // Workflow Name
    yaml += `# ${workflowName}\n`;
    yaml += `name: ${workflowName}\n`;
    lineNumber += 2;

    // Triggers
    yaml += `\non:\n`;
    lineNumber += 1;

    if (workflowTriggers.push.enabled) {
      yaml += `  push:\n`;
      lineNumber += 1;
      if (workflowTriggers.push.branches.length > 0) {
        yaml += `    branches: [${workflowTriggers.push.branches.map(b => `"${b}"`).join(', ')}]\n`;
        lineNumber += 1;
      }
    }

    if (workflowTriggers.pull_request.enabled) {
      yaml += `  pull_request:\n`;
      lineNumber += 1;
      if (workflowTriggers.pull_request.types.length > 0) {
        yaml += `    types: [${workflowTriggers.pull_request.types.map(t => `"${t}"`).join(', ')}]\n`;
        lineNumber += 1;
      }
      if (workflowTriggers.pull_request.branches.length > 0) {
        yaml += `    branches: [${workflowTriggers.pull_request.branches.map(b => `"${b}"`).join(', ')}]\n`;
        lineNumber += 1;
      }
    }

    // Jobs
    yaml += `\njobs:\n`;
    lineNumber += 1;

    jobs.forEach((job, jobIndex) => {
      yaml += `  ${job.name}:\n`;
      lineNumber += 1;
      
      yaml += `    runs-on: ${Array.isArray(job.runsOn) ? `[${job.runsOn.map(r => `"${r}"`).join(', ')}]` : `"${job.runsOn}"`}\n`;
      lineNumber += 1;

      if (job.steps.length > 0) {
        yaml += `    steps:\n`;
        lineNumber += 1;
        
        job.steps.forEach((step, stepIndex) => {
          if (step.name) {
            yaml += `    - name: ${step.name}\n`;
            lineNumber += 1;
          } else {
            yaml += `    -\n`;
            lineNumber += 1;
          }
          
          if (step.uses) {
            yaml += `      uses: ${step.uses}\n`;
            lineNumber += 1;
          }
          
          if (step.run) {
            yaml += `      run: ${step.run}\n`;
            lineNumber += 1;
          }
        });
      }
    });

    return yaml;
  };

  // 라인 매핑 정보 생성
  const generateLineMapping = () => {
    const mapping: { [key: string]: number[] } = {};
    let lineNumber = 1;

    // Workflow Name (라인 1-2)
    mapping['workflow-name'] = [1, 2];
    lineNumber += 2;

    // Triggers (라인 4부터)
    mapping['triggers-section'] = [4];
    lineNumber += 1;

    if (workflowTriggers.push.enabled) {
      mapping['push-trigger'] = [lineNumber];
      lineNumber += 1;
      if (workflowTriggers.push.branches.length > 0) {
        mapping['push-branches'] = [lineNumber];
        lineNumber += 1;
      }
    }

    if (workflowTriggers.pull_request.enabled) {
      mapping['pr-trigger'] = [lineNumber];
      lineNumber += 1;
      if (workflowTriggers.pull_request.types.length > 0) {
        mapping['pr-types'] = [lineNumber];
        lineNumber += 1;
      }
      if (workflowTriggers.pull_request.branches.length > 0) {
        mapping['pr-branches'] = [lineNumber];
        lineNumber += 1;
      }
    }

    // Jobs (라인 lineNumber부터)
    mapping['jobs-section'] = [lineNumber];
    lineNumber += 1;

    jobs.forEach((job, jobIndex) => {
      mapping[`job-${jobIndex}`] = [lineNumber];
      lineNumber += 1;
      
      mapping[`job-${jobIndex}-runs-on`] = [lineNumber];
      lineNumber += 1;

      if (job.steps.length > 0) {
        mapping[`job-${jobIndex}-steps`] = [lineNumber];
        lineNumber += 1;
        
        job.steps.forEach((step, stepIndex) => {
          mapping[`job-${jobIndex}-step-${stepIndex}`] = [lineNumber];
          lineNumber += 1;
          
          if (step.name) {
            mapping[`job-${jobIndex}-step-${stepIndex}-name`] = [lineNumber];
            lineNumber += 1;
          }
          
          if (step.uses) {
            mapping[`job-${jobIndex}-step-${stepIndex}-uses`] = [lineNumber];
            lineNumber += 1;
          }
          
          if (step.run) {
            mapping[`job-${jobIndex}-step-${stepIndex}-run`] = [lineNumber];
            lineNumber += 1;
          }
        });
      }
    });

    return mapping;
  };

  // 정확한 라인 매핑을 위한 함수
  const findYamlLinesForDropdown = (elementKey: string): number[] => {
    const generatedYaml = generateYaml();
    const lines = generatedYaml.split('\n');
    const lineNumbers: number[] = [];

    // elementKey에 따라 정확한 YAML 내용 찾기
    if (elementKey === 'workflow-name') {
      // Workflow name 관련 라인들 찾기
      lines.forEach((line, index) => {
        if (line.includes('name:') || line.startsWith('#')) {
          lineNumbers.push(index + 1);
        }
      });
    }
    
    else if (elementKey === 'push-branches') {
      // Push branches 관련 라인들 찾기
      lines.forEach((line, index) => {
        if (line.includes('branches:') && lines[index - 1]?.includes('push:')) {
          lineNumbers.push(index + 1);
        }
      });
    }
    
    else if (elementKey === 'pr-types') {
      // Pull request types 관련 라인들 찾기
      lines.forEach((line, index) => {
        if (line.includes('types:') && lines[index - 1]?.includes('pull_request:')) {
          lineNumbers.push(index + 1);
        }
      });
    }
    
    else if (elementKey === 'pr-branches') {
      // Pull request branches 관련 라인들 찾기
      lines.forEach((line, index) => {
        if (line.includes('branches:') && lines[index - 1]?.includes('pull_request:')) {
          lineNumbers.push(index + 1);
        }
      });
    }
    
    else if (elementKey.startsWith('job-') && elementKey.includes('-runs-on')) {
      const jobIndex = parseInt(elementKey.split('-')[1]);
      const job = jobs[jobIndex];
      if (job) {
        // 해당 job의 runs-on 라인 찾기
        lines.forEach((line, index) => {
          if (line.includes('runs-on:') && lines[index - 1]?.includes(`${job.name}:`)) {
            lineNumbers.push(index + 1);
          }
        });
      }
    }
    
    else if (elementKey.startsWith('job-') && elementKey.includes('-step-')) {
      const parts = elementKey.split('-');
      const jobIndex = parseInt(parts[1]);
      const stepIndex = parseInt(parts[3]);
      const fieldType = parts[4]; // name, uses, run
      const job = jobs[jobIndex];
      
      if (job && job.steps[stepIndex]) {
        // 해당 step의 특정 필드 라인 찾기
        lines.forEach((line, index) => {
          if (line.includes(`${fieldType}:`) && line.includes(job.steps[stepIndex][fieldType as keyof typeof job.steps[0]] || '')) {
            lineNumbers.push(index + 1);
          }
        });
      }
    }

    return lineNumbers;
  };


  if (!actionId) {
    return <div className="editor-placeholder">Select an action to edit workflow</div>;
  }

  return (
    <div className="editor-container">
      {/* 좌측 Actions 사이드바 */}
      <Sidebar
        actions={actions}
        selectedAction={selectedAction}
        onActionSelect={handleActionSelect}
        dropdownStates={dropdownStates}
        onDropdownItemSelect={handleDropdownItemSelect}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={handleSidebarToggle}
      />

      {/* 사이드바가 닫혔을 때 화살표 */}
      <div className="sidebar-collapsed-arrow" onClick={handleSidebarToggle}>
        <svg viewBox="0 0 24 24">
          <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
        </svg>
      </div>

      {/* 중앙 Build 섹션 */}
      <div className="editor-main">
        <div className="main-header">
          <h1 className="main-title">Workflow Editor</h1>
        </div>

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
                onChange={(e) => updateWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                onFocus={() => handleInputFocus('workflow-name')}
                onBlur={handleInputBlur}
              />
            </div>
          </div>

          {/* Triggers Section */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">Triggers</h2>
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
                        onChange={(e) => updateWorkflowTrigger('push', 'branches', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="main, develop"
                        onFocus={() => handleInputFocus('push-branches')}
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
                      <select
                        multiple
                        value={workflowTriggers.pull_request.types}
                        onChange={(e) => updateWorkflowTrigger('pull_request', 'types', 
                          Array.from(e.target.selectedOptions, option => option.value)
                        )}
                        onFocus={() => handleDropdownFocus('pr-types')}
                        onBlur={handleDropdownBlur}
                      >
                        <option value="opened">opened</option>
                        <option value="synchronize">synchronize</option>
                        <option value="reopened">reopened</option>
                        <option value="closed">closed</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Branches:</label>
                      <input
                        type="text"
                        value={workflowTriggers.pull_request.branches.join(', ')}
                        onChange={(e) => updateWorkflowTrigger('pull_request', 'branches', e.target.value.split(',').map(s => s.trim()))}
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

          {/* Jobs Section */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">Jobs</h2>
              <button className="add-job-btn" onClick={addJob}>+ Add Job</button>
            </div>
            <div className="section-content">
              {jobs.map((job, jobIndex) => (
                <div key={jobIndex} className="job-item">
                  <div className="job-header" onClick={() => toggleMainPanelDropdown(`job-${jobIndex}`)}>
                    <span className="job-name">{job.name}</span>
                    <span className={`dropdown-arrow ${mainPanelDropdowns[`job-${jobIndex}`] ? 'open' : ''}`}>
                      ▼
                    </span>
                  </div>
                  {mainPanelDropdowns[`job-${jobIndex}`] && (
                    <div className="job-details">
                      <div className="field-group">
                        <label>Runs on:</label>
                        <input
                          type="text"
                          value={job.runsOn.join(', ')}
                          onChange={(e) => updateJob(jobIndex, 'runsOn', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="ubuntu-latest"
                          onFocus={() => handleInputFocus(`job-${jobIndex}-runs-on`)}
                          onBlur={handleInputBlur}
                        />
                      </div>
                      <div className="field-group">
                        <label>Steps:</label>
                        <button className="add-step-btn" onClick={() => addStep(jobIndex)}>+ Add Step</button>
                        {job.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="step-item">
                            <input
                              type="text"
                              placeholder="Step name (optional)"
                              value={step.name || ''}
                              onChange={(e) => {
                                const newSteps = [...job.steps];
                                newSteps[stepIndex] = { ...step, name: e.target.value };
                                updateJob(jobIndex, 'steps', newSteps);
                              }}
                              onFocus={() => handleInputFocus(`job-${jobIndex}-step-${stepIndex}-name`)}
                              onBlur={handleInputBlur}
                            />
                            <input
                              type="text"
                              placeholder="Action to use (uses)"
                              value={step.uses || ''}
                              onChange={(e) => {
                                const newSteps = [...job.steps];
                                newSteps[stepIndex] = { ...step, uses: e.target.value };
                                updateJob(jobIndex, 'steps', newSteps);
                              }}
                              onFocus={() => handleInputFocus(`job-${jobIndex}-step-${stepIndex}-uses`)}
                              onBlur={handleInputBlur}
                            />
                            <input
                              type="text"
                              placeholder="Command to run (run)"
                              value={step.run || ''}
                              onChange={(e) => {
                                const newSteps = [...job.steps];
                                newSteps[stepIndex] = { ...step, run: e.target.value };
                                updateJob(jobIndex, 'steps', newSteps);
                              }}
                              onFocus={() => handleInputFocus(`job-${jobIndex}-step-${stepIndex}-run`)}
                              onBlur={handleInputBlur}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 우측 YAML 미리보기 */}
      <YamlViewer 
        yamlContent={workflowContent} 
        highlightedLines={getHighlightedLines()}
      />
    </div>
  );
};

export default Editor;