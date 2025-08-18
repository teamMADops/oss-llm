"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./WorkflowEditor.css");
const WorkflowEditor = () => {
    // 이 컴포넌트는 현재 정적인 UI 구조만 담당합니다.
    // 데이터 연동 로직은 다음 단계에서 추가됩니다.
    return (<div className="container">
        {/* 좌측 사이드바 */}
        <div className="sidebar">
            <div className="sidebar-header">
                Workflows
            </div>
            <div className="workflow-list">
                <div className="workflow-item active">
                    <span className="workflow-icon">🏗️</span>
                    <span>Build and Test</span>
                </div>
                <div className="workflow-item">
                    <span className="workflow-icon">🚀</span>
                    <span>Deploy to Production</span>
                </div>
                <div className="workflow-item">
                    <span className="workflow-icon">🏷️</span>
                    <span>Release</span>
                </div>
                <div className="workflow-item">
                    <span className="workflow-icon">🌙</span>
                    <span>Nightly Build</span>
                </div>
                <div className="workflow-item">
                    <span className="workflow-icon">🔄</span>
                    <span>CI/CD Pipeline</span>
                </div>
            </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="main-content">
            <div className="main-header">
                <h1>Workflow Editor</h1>
            </div>
            <div className="editor-content">
                {/* Trigger 섹션 */}
                <div className="form-section">
                    <h3>Trigger</h3>
                    <div className="form-group">
                        <label>Configure the events that trigger this workflow</label>
                        <select className="form-control">
                            <option>Push</option>
                            <option>Pull Request</option>
                            <option>Schedule</option>
                            <option>Manual</option>
                        </select>
                    </div>
                </div>

                {/* Event 섹션 */}
                <div className="form-section">
                    <h3>Event</h3>
                    <div className="form-group">
                        <select className="form-control">
                            <option>Select...</option>
                            <option>push</option>
                            <option>pull_request</option>
                            <option>schedule</option>
                            <option>workflow_dispatch</option>
                        </select>
                    </div>
                </div>

                {/* Branch 섹션 */}
                <div className="form-section">
                    <h3>Branch</h3>
                    <div className="form-group">
                        <select className="form-control">
                            <option>Select...</option>
                            <option>main</option>
                            <option>develop</option>
                            <option>feature/*</option>
                        </select>
                    </div>
                </div>

                {/* Cron Expression */}
                <div className="form-section">
                    <h3>Cron Expression</h3>
                    <div className="form-group">
                        <input type="text" className="form-control" placeholder="Enter cron expression..." defaultValue="cronexpression"/>
                    </div>
                </div>

                {/* Jobs 섹션 */}
                <div className="form-section">
                    <h3>Jobs</h3>
                    <div className="jobs-section">
                        <div className="job-item">
                            <div className="job-header">
                                <div className="job-icon">
                                    <span>👤</span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Job 1</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>Drag and drop to reorder jobs</div>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Job Name</label>
                                <input type="text" className="form-control" placeholder="Enter job name..." defaultValue="jobname"/>
                            </div>

                            <div className="form-group">
                                <label>Runs On</label>
                                <select className="form-control">
                                    <option>Select...</option>
                                    <option>ubuntu-latest</option>
                                    <option>windows-latest</option>
                                    <option>macos-latest</option>
                                </select>
                            </div>

                            {/* Environment Variables */}
                            <div className="form-group">
                                <label>Environment Variables</label>
                                <table className="steps-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>ENV_VAR_1</td>
                                            <td>value1</td>
                                        </tr>
                                        <tr>
                                            <td>ENV_VAR_2</td>
                                            <td>value2</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Steps 섹션 */}
                <div className="form-section">
                    <h3>Steps</h3>
                    <table className="steps-table">
                        <thead>
                            <tr>
                                <th>Step Name</th>
                                <th>Action</th>
                                <th>Inputs</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Checkout Code</td>
                                <td>actions/checkout@v3</td>
                                <td>github-token</td>
                            </tr>
                            <tr>
                                <td>Setup Node.js</td>
                                <td>actions/setup-node@v3</td>
                                <td>node-version: 18</td>
                            </tr>
                            <tr>
                                <td>Run Tests</td>
                                <td>npm run test</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Action 섹션 */}
                <div className="form-section">
                    <h3>Action</h3>
                    <div className="form-group">
                        <select className="form-control">
                            <option>Select...</option>
                            <option>actions/checkout</option>
                            <option>actions/setup-node</option>
                            <option>actions/upload-artifact</option>
                        </select>
                    </div>
                </div>

                {/* Custom Script */}
                <div className="form-section">
                    <h3>Custom Script</h3>
                    <div className="form-group">
                        <textarea className="form-control" rows={4} placeholder="Enter custom script..."></textarea>
                    </div>
                </div>

                {/* Timeout */}
                <div className="form-section">
                    <h3>Timeout</h3>
                    <div className="form-group">
                        <input type="text" className="form-control" placeholder="Enter timeout..." defaultValue="timeout-in"/>
                    </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <button className="btn">Save</button>
                    <button className="btn btn-secondary" style={{ marginLeft: '10px' }}>Discard</button>
                </div>
            </div>
        </div>

        {/* 우측 패널 */}
        <div className="right-panel">
            {/* Quick Links */}
            <div className="panel-section">
                <h3>Quick Links</h3>
                <ul className="quick-links">
                    <li><a href="#">Workflow Documentation →</a></li>
                    <li><a href="#">CI/CD Best Practices →</a></li>
                </ul>
            </div>

            {/* LLM Prompt */}
            <div className="panel-section">
                <h3>LLM Prompt</h3>
                <div className="llm-prompt"></div>
                <button className="btn" style={{ marginTop: '10px' }}>Submit</button>
            </div>

            {/* Settings */}
            <div className="panel-section">
                <h3>Settings</h3>
                <div className="settings-toggle">
                    <span>Theme</span>
                    <span>System</span>
                </div>
                <div className="settings-toggle">
                    <span>Notifications</span>
                    <div className="toggle active"></div>
                </div>
            </div>

            {/* Live YAML Preview */}
            <div className="panel-section" style={{ flex: 1 }}>
                <h3>Live YAML Preview</h3>
                <div className="yaml-preview">
        {`name: Build and Test
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm test`}
                </div>
            </div>
        </div>
    </div>);
};
exports.default = WorkflowEditor;
