"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const YamlViewer_1 = __importDefault(require("./YamlViewer"));
const github_1 = require("../../api/github");
require("./Editor.css");
// dev/FE의 UI 컴포넌트와 상태 로직을 대부분 재사용
const Editor = ({ actionId, isSidebarOpen = true }) => {
    // --- State ---
    const [workflowContent, setWorkflowContent] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    // TODO: API로 받아온 YAML을 파싱하여 아래 상태들을 채우는 로직 필요
    // 현재는 dev/FE의 Mock 데이터를 사용하여 UI를 구성
    const [workflowName, setWorkflowName] = (0, react_1.useState)('CI/CD Workflow');
    // FE/sungwon의 정교한 UI를 위한 상태 변수들
    const [workflowTriggers, setWorkflowTriggers] = (0, react_1.useState)({
        push: { branches: ['main'], enabled: true },
        pull_request: {
            types: ['opened', 'synchronize'],
            branches: ['main'],
            paths: [],
            enabled: false
        }
    });
    const [jobs, setJobs] = (0, react_1.useState)([
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
    const [mainPanelDropdowns, setMainPanelDropdowns] = (0, react_1.useState)({});
    // 하이라이트할 라인 상태
    const [highlightedLines, setHighlightedLines] = (0, react_1.useState)({});
    // 현재 포커스된 요소 상태
    const [focusedElement, setFocusedElement] = (0, react_1.useState)(null);
    // --- Effects ---
    (0, react_1.useEffect)(() => {
        if (actionId) {
            setIsLoading(true);
            (0, github_1.getWorkflowFile)(actionId)
                .then(content => {
                setWorkflowContent(content);
                // TODO: content(YAML)를 파싱해서 workflowName 등의 상태를 업데이트해야 함
            })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [actionId]);
    // YAML 내용을 workflowContent에 반영
    (0, react_1.useEffect)(() => {
        const generatedYaml = generateYaml();
        setWorkflowContent(generatedYaml);
    }, [workflowName, workflowTriggers, jobs]);
    // --- Handlers ---
    const handleSave = async () => {
        if (!actionId || isSaving)
            return;
        setIsSaving(true);
        try {
            // TODO: 현재 UI 상태(workflowName 등)를 YAML 문자열로 다시 생성하는 로직 필요
            // 지금은 에디터의 내용을 그대로 저장
            await (0, github_1.saveWorkflowFile)(actionId, workflowContent);
            alert('Workflow saved successfully!');
        }
        catch (err) {
            alert('Failed to save workflow.');
            console.error(err);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleWorkflowContentChange = (content) => {
        setWorkflowContent(content);
    };
    // FE/sungwon의 정교한 UI를 위한 함수들
    const toggleMainPanelDropdown = (dropdownKey) => {
        setMainPanelDropdowns(prev => ({
            ...prev,
            [dropdownKey]: !prev[dropdownKey]
        }));
        // 하이라이트 업데이트
        updateHighlightedLines(dropdownKey);
    };
    // 포커스 이벤트 핸들러들
    const handleInputFocus = (inputKey) => {
        setFocusedElement(inputKey);
        updateHighlightedLines(inputKey);
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
    const updateWorkflowTrigger = (trigger, field, value) => {
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
    const updateJob = (jobIndex, field, value) => {
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
    // 하이라이트 라인 업데이트 함수
    const updateHighlightedLines = (elementKey) => {
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
    const findYamlLinesForDropdown = (elementKey) => {
        console.log('🔍 findYamlLinesForDropdown 호출됨:', elementKey);
        const lines = workflowContent.split('\n');
        console.log('📄 YAML 라인 수:', lines.length);
        const lineMap = {};
        // 워크플로우 이름
        if (elementKey === 'workflow-name') {
            const nameLineIndex = lines.findIndex(line => line.startsWith('name:'));
            if (nameLineIndex !== -1) {
                lineMap[elementKey] = [nameLineIndex + 1];
            }
        }
        // Push 트리거 드롭다운
        if (elementKey === 'push-trigger') {
            const onIndex = lines.findIndex(line => line.trim() === 'on:');
            const pushIndex = lines.findIndex(line => line.trim() === 'push:');
            if (onIndex !== -1 && pushIndex !== -1) {
                lineMap[elementKey] = [onIndex + 1, pushIndex + 1];
            }
        }
        // Pull Request 트리거 드롭다운
        if (elementKey === 'pr-trigger') {
            const onIndex = lines.findIndex(line => line.trim() === 'on:');
            const prIndex = lines.findIndex(line => line.trim() === 'pull_request:');
            if (onIndex !== -1 && prIndex !== -1) {
                lineMap[elementKey] = [onIndex + 1, prIndex + 1];
            }
        }
        // Job 드롭다운
        if (elementKey.startsWith('job-') && !elementKey.includes('-runs-on') && !elementKey.includes('-step-')) {
            const jobIndexNum = parseInt(elementKey.split('-')[1]);
            const jobName = jobs[jobIndexNum]?.name;
            if (jobName) {
                const jobLineIndex = lines.findIndex(line => line.trim() === `${jobName}:`);
                if (jobLineIndex !== -1) {
                    lineMap[elementKey] = [jobLineIndex + 1];
                }
            }
        }
        console.log('🎯 최종 하이라이트 라인:', lineMap[elementKey] || []);
        return lineMap[elementKey] || [];
    };
    // 현재 하이라이트된 라인들 가져오기
    const getHighlightedLines = () => {
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
            if (workflowTriggers.pull_request.paths.length > 0) {
                yaml += `    paths: [${workflowTriggers.pull_request.paths.map(p => `'${p}'`).join(', ')}]\n`;
            }
        }
        // Jobs
        yaml += '\n';
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
                }
                else if (step.run) {
                    yaml += `run: ${step.run}\n`;
                }
            });
            yaml += '\n';
        });
        return yaml;
    };
    // --- Render ---
    if (!actionId) {
        return (<div className="editor-main-content">
        <div className="editor-empty-state">
          <p className="text-muted">워크플로우를 선택해주세요.</p>
        </div>
      </div>);
    }
    if (isLoading) {
        return (<div className="editor-main-content">
        <div className="editor-loading">
          <p className="text-muted">워크플로우를 불러오는 중...</p>
        </div>
      </div>);
    }
    return (<div className={`editor-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="editor-main">
        <div className="main-header">
          <div className="header-left">
            <h1 className="main-title">Workflow Editor</h1>
          </div>
          <div className="header-right">
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* Workflow Editor */}
        <div className="workflow-editor">
          {/* Workflow Name */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">Workflow Name</h2>
            </div>
            <div className="section-content">
              <input type="text" className="workflow-name-input" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Enter workflow name..." onFocus={() => handleInputFocus('workflow-name')} onBlur={handleInputBlur}/>
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
                    <input type="checkbox" checked={workflowTriggers.push.enabled} onChange={(e) => updateWorkflowTrigger('push', 'enabled', e.target.checked)}/>
                    <span className="checkmark"></span>
                  </label>
                  <span className="trigger-name">Push</span>
                  <span className={`dropdown-arrow ${mainPanelDropdowns['push-trigger'] ? 'open' : ''}`}>
                    ▼
                  </span>
                </div>
                {mainPanelDropdowns['push-trigger'] && workflowTriggers.push.enabled && (<div className="trigger-details">
                    <div className="field-group">
                      <label>Branches:</label>
                      <input type="text" value={workflowTriggers.push.branches.join(', ')} onChange={(e) => updateWorkflowTrigger('push', 'branches', e.target.value.split(', '))} placeholder="main, develop"/>
                    </div>
                  </div>)}
              </div>

              {/* Pull Request Trigger */}
              <div className="trigger-item">
                <div className="trigger-header" onClick={() => toggleMainPanelDropdown('pr-trigger')}>
                  <label className="trigger-checkbox">
                    <input type="checkbox" checked={workflowTriggers.pull_request.enabled} onChange={(e) => updateWorkflowTrigger('pull_request', 'enabled', e.target.checked)}/>
                    <span className="checkmark"></span>
                  </label>
                  <span className="trigger-name">Pull Request</span>
                  <span className={`dropdown-arrow ${mainPanelDropdowns['pr-trigger'] ? 'open' : ''}`}>
                    ▼
                  </span>
                </div>
                {mainPanelDropdowns['pr-trigger'] && workflowTriggers.pull_request.enabled && (<div className="trigger-details">
                    <div className="field-group">
                      <label>Types:</label>
                      <select multiple value={workflowTriggers.pull_request.types} onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                updateWorkflowTrigger('pull_request', 'types', selected);
            }}>
                        <option value="opened">Opened</option>
                        <option value="synchronize">Synchronize</option>
                        <option value="reopened">Reopened</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Branches:</label>
                      <input type="text" value={workflowTriggers.pull_request.branches.join(', ')} onChange={(e) => updateWorkflowTrigger('pull_request', 'branches', e.target.value.split(', '))} placeholder="main, develop"/>
                    </div>
                  </div>)}
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
              {jobs.map((job, jobIndex) => (<div key={jobIndex} className="job-item">
                  <div className="job-header" onClick={() => toggleMainPanelDropdown(`job-${jobIndex}`)}>
                    <span className="job-name">{job.name}</span>
                    <span className={`dropdown-arrow ${mainPanelDropdowns[`job-${jobIndex}`] ? 'open' : ''}`}>
                      ▼
                    </span>
                  </div>
                  {mainPanelDropdowns[`job-${jobIndex}`] && (<div className="job-details">
                      <div className="field-group">
                        <label>Name:</label>
                        <input type="text" value={job.name} onChange={(e) => updateJob(jobIndex, 'name', e.target.value)} placeholder="Job name"/>
                      </div>
                      <div className="field-group">
                        <label>Runs on:</label>
                        <input type="text" value={job.runsOn.join(', ')} onChange={(e) => updateJob(jobIndex, 'runsOn', e.target.value.split(', '))} placeholder="ubuntu-latest"/>
                      </div>
                      <div className="field-group">
                        <label>Steps:</label>
                        {job.steps.map((step, stepIndex) => (<div key={stepIndex} className="step-item">
                            <input type="text" value={step.name || ''} onChange={(e) => {
                        const newJobs = [...jobs];
                        newJobs[jobIndex].steps[stepIndex].name = e.target.value;
                        setJobs(newJobs);
                    }} placeholder="Step name"/>
                            <input type="text" value={step.run || step.uses || ''} onChange={(e) => {
                        const newJobs = [...jobs];
                        if (step.run) {
                            newJobs[jobIndex].steps[stepIndex].run = e.target.value;
                        }
                        else if (step.uses) {
                            newJobs[jobIndex].steps[stepIndex].uses = e.target.value;
                        }
                        setJobs(newJobs);
                    }} placeholder="Action or command"/>
                          </div>))}
                      </div>
                    </div>)}
                </div>))}
            </div>
          </div>

          {/* YAML Content Editor */}
          <div className="workflow-section">
            <div className="section-header">
              <h2 className="section-title">YAML Content</h2>
            </div>
            <div className="section-content">
              <textarea className="yaml-editor-textarea" value={workflowContent} onChange={(e) => handleWorkflowContentChange(e.target.value)} placeholder="Enter YAML content..." rows={20}/>
            </div>
          </div>

        </div>
      </div>

      {/* Right YAML Preview */}
      <div className="yaml-viewer-container">
        <YamlViewer_1.default yamlContent={workflowContent} highlightedLines={getHighlightedLines()} // 하이라이트된 라인 전달
    />
      </div>
    </div>);
};
exports.default = Editor;
