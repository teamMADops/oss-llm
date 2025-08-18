import React, { useState, useEffect } from 'react';
import YamlViewer from './YamlViewer';
import { getWorkflowFile, saveWorkflowFile } from '../../api/github';
import './Editor.css';

interface Action {
  id: string;
  name: string;
  status: 'success' | 'failed' | 'running';
}

interface EditorProps {
  actionId: string | null;
  isSidebarOpen?: boolean; // 사이드바 상태 추가
}

const Editor: React.FC<EditorProps> = ({ actionId, isSidebarOpen = true }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [dropdownStates, setDropdownStates] = useState<{
    [key: string]: {
      isOpen: boolean;
      selectedItem: string | null;
    };
  }>({});
  const [workflowContent, setWorkflowContent] = useState<string>('');

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
  console.log('사이드바 상태:', isSidebarOpen ? '열림' : '닫힘');

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

  // YAML 내용을 workflowContent에 반영
  useEffect(() => {
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  }, [workflowName, workflowTriggers, jobs]);

  // 메인 패널 dropdown 토글 함수
  const toggleMainPanelDropdown = (dropdownKey: string) => {
    setMainPanelDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));

    // 하이라이트 업데이트
    updateHighlightedLines(dropdownKey);
  };

  // 포커스 이벤트 핸들러들
  const handleInputFocus = (inputKey: string) => {
    setFocusedElement(inputKey);
    updateHighlightedLines(inputKey);
  };

  const handleInputBlur = () => {
    setFocusedElement(null);
    setHighlightedLines({});
  };

  const handleDropdownFocus = (dropdownKey: string) => {
    setFocusedElement(dropdownKey);
    updateHighlightedLines(dropdownKey);
  };

  const handleDropdownBlur = () => {
    setFocusedElement(null);
    setHighlightedLines({});
  };

  // 워크플로우 트리거 업데이트 함수
  const updateWorkflowTrigger = (trigger: 'push' | 'pull_request', field: string, value: any) => {
    setWorkflowTriggers(prev => ({
      ...prev,
      [trigger]: {
        ...prev[trigger],
        [field]: value
      }
    }));

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  // Job 업데이트 함수
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

  // Job 추가 함수
  const addJob = () => {
    const newJob = {
      name: `job-${jobs.length + 1}`,
      runsOn: ['ubuntu-latest'],
      steps: [
        { name: 'Checkout code', uses: 'actions/checkout@v4' }
      ]
    };
    setJobs([...jobs, newJob]);

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  // Step 추가 함수
  const addStep = (jobIndex: number) => {
    const newJobs = [...jobs];
    newJobs[jobIndex].steps.push({
      name: `Step ${newJobs[jobIndex].steps.length + 1}`,
      run: 'echo "Hello World"'
    });
    setJobs(newJobs);

    // YAML 업데이트
    const generatedYaml = generateYaml();
    setWorkflowContent(generatedYaml);
  };

  // YAML 생성 함수
  const generateYaml = () => {
    let yaml = `name: ${workflowName}\n\n`;
    
    // Triggers
    yaml += 'on:\n';
    if (workflowTriggers.push.enabled) {
      yaml += '  push:\n';
      yaml += `    branches: [${workflowTriggers.push.branches.map(b => `'${b}'`).join(', ')}]\n`;
    }
    if (workflowTriggers.pull_request.enabled) {
      yaml += '  pull_request:\n';
      yaml += `    types: [${workflowTriggers.pull_request.types.map(t => `'${t}'`).join(', ')}]\n`;
      yaml += `    branches: [${workflowTriggers.pull_request.branches.map(b => `'${b}'`).join(', ')}]\n`;
    }
    
    yaml += '\n';
    
    // Jobs
    yaml += 'jobs:\n';
    jobs.forEach((job, index) => {
      yaml += `  ${job.name}:\n`;
      yaml += `    runs-on: ${job.runsOn.join(', ')}\n`;
      yaml += '    steps:\n';
      job.steps.forEach((step, stepIndex) => {
        yaml += `      - name: ${step.name || `Step ${stepIndex + 1}`}\n`;
        if (step.uses) {
          yaml += `        uses: ${step.uses}\n`;
        }
        if (step.run) {
          yaml += `        run: ${step.run}\n`;
        }
      });
      yaml += '\n';
    });
    
    return yaml;
  };

  // 하이라이트 라인 업데이트 함수
  const updateHighlightedLines = (elementKey: string) => {
    console.log('🎨 updateHighlightedLines 호출됨:', elementKey);
    const lines = findYamlLinesForDropdown(elementKey);
    console.log('📊 찾은 라인들:', lines);
    
    // 기존 하이라이트를 유지하면서 새로운 하이라이트 추가
    setHighlightedLines(prev => ({
      ...prev,
      [elementKey]: lines
    }));
  };

  // YAML 라인 찾기 함수 (실제 YAML 구조 기반)
  const findYamlLinesForDropdown = (elementKey: string): number[] => {
    console.log('🔍 findYamlLinesForDropdown 호출됨:', elementKey);
    const lines = workflowContent.split('\n');
    console.log('📄 YAML 라인 수:', lines.length);
    console.log('📝 YAML 내용:', workflowContent);
    
    const lineMap: { [key: string]: number[] } = {};
    
    // 워크플로우 이름
    if (elementKey === 'workflow-name') {
      const nameLineIndex = lines.findIndex(line => line.startsWith('name:'));
      console.log('🏷️ 워크플로우 이름 라인 찾기:', nameLineIndex);
      if (nameLineIndex !== -1) {
        lineMap[elementKey] = [nameLineIndex + 1];
      }
    }
    
    // Push 트리거 드롭다운
    if (elementKey === 'push-trigger') {
      const onIndex = lines.findIndex(line => line.trim() === 'on:');
      const pushIndex = lines.findIndex(line => line.trim() === 'push:');
      console.log('⬆️ Push 트리거 드롭다운 라인 찾기:', onIndex, pushIndex);
      if (onIndex !== -1 && pushIndex !== -1) {
        lineMap[elementKey] = [onIndex + 1, pushIndex + 1];
      }
    }
    
    // Push 브랜치 입력 필드
    if (elementKey === 'push-branches') {
      const pushIndex = lines.findIndex(line => line.trim() === 'push:');
      console.log('⬆️ Push 트리거 라인 찾기:', pushIndex);
      if (pushIndex !== -1) {
        const branchesIndex = lines.findIndex((line, idx) => idx > pushIndex && line.includes('branches:'));
        console.log('🌿 Push 브랜치 라인 찾기:', branchesIndex);
        if (branchesIndex !== -1) {
          lineMap[elementKey] = [pushIndex + 1, branchesIndex + 1];
        }
      }
    }
    
    // Pull Request 트리거 드롭다운
    if (elementKey === 'pr-trigger') {
      const onIndex = lines.findIndex(line => line.trim() === 'on:');
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      console.log('🔀 Pull Request 트리거 드롭다운 라인 찾기:', onIndex, prIndex);
      if (onIndex !== -1 && prIndex !== -1) {
        lineMap[elementKey] = [onIndex + 1, prIndex + 1];
      }
    }
    
    // Pull Request 브랜치 입력 필드
    if (elementKey === 'pr-branches') {
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      console.log('🔀 Pull Request 트리거 라인 찾기:', prIndex);
      if (prIndex !== -1) {
        const branchesIndex = lines.findIndex((line, idx) => idx > prIndex && line.includes('branches:'));
        console.log('🌿 PR 브랜치 라인 찾기:', branchesIndex);
        if (branchesIndex !== -1) {
          lineMap[elementKey] = [prIndex + 1, branchesIndex + 1];
        }
      }
    }
    
    // Pull Request 타입 선택
    if (elementKey === 'pr-types') {
      const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
      console.log('🔀 Pull Request 타입 라인 찾기:', prIndex);
      if (prIndex !== -1) {
        const typesIndex = lines.findIndex((line, idx) => idx > prIndex && line.includes('types:'));
        console.log('🏷️ PR 타입 라인 찾기:', typesIndex);
        if (typesIndex !== -1) {
          lineMap[elementKey] = [prIndex + 1, typesIndex + 1];
        }
      }
    }
    
    // Job 드롭다운
    if (elementKey.startsWith('job-') && !elementKey.includes('-runs-on') && !elementKey.includes('-step-')) {
      const jobIndexNum = parseInt(elementKey.split('-')[1]);
      const jobName = jobs[jobIndexNum]?.name;
      console.log('🔧 Job 드롭다운 라인 찾기:', elementKey, 'jobIndex:', jobIndexNum, 'jobName:', jobName);
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        console.log('📋 Job 라인 찾기:', jobLineIndex);
        if (jobLineIndex !== -1) {
          lineMap[elementKey] = [jobLineIndex + 1];
        }
      }
    }
    
    // Job runs-on 입력 필드
    if (elementKey.startsWith('job-') && elementKey.includes('-runs-on')) {
      const jobIndexNum = parseInt(elementKey.split('-')[1]);
      const jobName = jobs[jobIndexNum]?.name;
      console.log('🔧 Job runs-on 라인 찾기:', elementKey, 'jobIndex:', jobIndexNum, 'jobName:', jobName);
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        console.log('📋 Job 라인 찾기:', jobLineIndex);
        if (jobLineIndex !== -1) {
          const runsOnIndex = lines.findIndex((line, idx) => idx > jobLineIndex && line.includes('runs-on:'));
          console.log('🏃‍♂️ Runs-on 라인 찾기:', runsOnIndex);
          if (runsOnIndex !== -1) {
            lineMap[elementKey] = [jobLineIndex + 1, runsOnIndex + 1];
          }
        }
      }
    }
    
    // Step 관련
    if (elementKey.includes('-step-') && (elementKey.includes('-name') || elementKey.includes('-uses') || elementKey.includes('-run'))) {
      const parts = elementKey.split('-');
      const jobIndexNum = parseInt(parts[1]);
      const stepIndexNum = parseInt(parts[3]);
      const field = parts[4];
      const jobName = jobs[jobIndexNum]?.name;
      console.log('📝 Step 관련 라인 찾기:', elementKey, 'jobName:', jobName, 'field:', field, 'stepIndex:', stepIndexNum);
      
      if (jobName) {
        const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
        console.log('📋 Step Job 라인 찾기:', jobLineIndex);
        if (jobLineIndex !== -1) {
          const stepsIndex = lines.findIndex((line, idx) => idx > jobLineIndex && line.trim() === 'steps:');
          console.log('📋 Steps 라인 찾기:', stepsIndex);
          if (stepsIndex !== -1) {
            // Step의 시작 라인 찾기 (stepIndexNum에 해당하는 Step)
            let currentStepCount = 0;
            let stepStartIndex = -1;
            
            for (let i = stepsIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.trim().startsWith('-') && line.includes('name:')) {
                if (currentStepCount === stepIndexNum) {
                  stepStartIndex = i;
                  break;
                }
                currentStepCount++;
              }
            }
            
            console.log('📋 Step 시작 라인 찾기:', stepStartIndex, 'currentStepCount:', currentStepCount);
            
            if (stepStartIndex !== -1) {
              // 해당 필드의 라인 찾기
              let fieldIndex = -1;
              
              if (field === 'name') {
                // name은 Step 시작 라인에 있음
                fieldIndex = stepStartIndex;
              } else {
                // uses, run은 Step 시작 라인 이후에 있음
                for (let i = stepStartIndex + 1; i < lines.length; i++) {
                  const line = lines[i];
                  if (line.trim().startsWith('-') && line.includes('name:')) {
                    // 다음 Step의 시작에 도달하면 종료
                    break;
                  }
                  if (line.includes(`${field}:`) && !line.trim().startsWith('#')) {
                    fieldIndex = i;
                    break;
                  }
                }
              }
              
              console.log('📝 Step 필드 라인 찾기:', fieldIndex, 'field:', field);
              if (fieldIndex !== -1) {
                lineMap[elementKey] = [stepStartIndex + 1, fieldIndex + 1];
              } else {
                // 필드를 찾지 못했으면 Step 시작 라인만 하이라이트
                lineMap[elementKey] = [stepStartIndex + 1];
              }
            }
          }
        }
      }
    }
    
    console.log('🎯 최종 하이라이트 라인:', lineMap[elementKey] || []);
    return lineMap[elementKey] || [];
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

  if (!actionId) {
    return <div className="editor-placeholder">Select an action to edit workflow</div>;
  }

  return (
    <div className={`editor-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Central Build Section */}
      <div className="editor-main">
        {/* Main Header */}
        <div className="main-header">
          <h1 className="main-title">Workflow Editor</h1>
        </div>

        {/* Workflow Editor */}
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
                        onChange={(e) => {
                          const selectedTypes = Array.from(e.target.selectedOptions, option => option.value);
                          updateWorkflowTrigger('pull_request', 'types', selectedTypes);
                          
                          // 선택된 타입들에 대한 하이라이트 업데이트
                          const types = selectedTypes;
                          const lines = workflowContent.split('\n');
                          const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
                          const typesIndex = lines.findIndex((line, idx) => idx > prIndex && line.includes('types:'));
                          
                          if (prIndex !== -1 && typesIndex !== -1) {
                            setHighlightedLines(prev => ({
                              ...prev,
                              'pr-types': [prIndex + 1, typesIndex + 1]
                            }));
                          }
                        }}
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

      {/* Right YAML Preview */}
      <div className="yaml-viewer-container">
        <YamlViewer 
          yamlContent={workflowContent} 
          highlightedLines={getHighlightedLines()}
        />
      </div>
    </div>
  );
};

export default Editor;