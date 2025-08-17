import React, { useState, useEffect } from "react";
import YamlViewer from "./YamlViewer";
import { getWorkflowFile /*saveWorkflowFile */ } from "../../api/github";
import "./Editor.css";

// Props: App.tsx로부터 받음
interface EditorProps {
  actionId: string | null;
}

// dev/FE의 UI 컴포넌트와 상태 로직을 대부분 재사용
const Editor: React.FC<EditorProps> = ({ actionId }) => {
  // --- State ---
  const [workflowContent, setWorkflowContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // TODO: API로 받아온 YAML을 파싱하여 아래 상태들을 채우는 로직 필요
  // 현재는 dev/FE의 Mock 데이터를 사용하여 UI를 구성
  const [workflowName, setWorkflowName] = useState("CI/CD Workflow");
  // const [workflowTriggers, setWorkflowTriggers] = useState({
  //   push: { branches: ["main"], enabled: true },
  //   pull_request: {
  //     types: ["opened", "synchronize"],
  //     branches: ["main"],
  //     paths: [],
  //     enabled: false,
  //   },
  // });
  // const [jobs, setJobs] = useState<any[]>([
  //   {
  //     name: "build",
  //     runsOn: ["ubuntu-latest"],
  //     steps: [
  //       { name: "Checkout code", uses: "actions/checkout@v4" },
  //       { name: "Setup Node.js", uses: "actions/setup-node@v4" },
  //       { name: "Install dependencies", run: "npm ci" },
  //     ],
  //   },
  // ]);
  // const [mainPanelDropdowns, setMainPanelDropdowns] = useState<{
  //   [key: string]: boolean;
  // }>({});

  // --- Effects ---
  useEffect(() => {
    if (actionId) {
      setIsLoading(true);
      getWorkflowFile(actionId)
        .then((content) => {
          setWorkflowContent(content);
          // TODO: content(YAML)를 파싱해서 workflowName, jobs 등의 상태를 업데이트해야 함
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [actionId]);

  // --- Handlers ---
  // const toggleMainPanelDropdown = (dropdownKey: string) => {
  //   setMainPanelDropdowns((prev) => ({
  //     ...prev,
  //     [dropdownKey]: !prev[dropdownKey],
  //   }));
  // };

  // const handleSave = () => {
  //   if (!actionId) return;
  //   // TODO: 현재 UI 상태(workflowName, jobs 등)를 YAML 문자열로 다시 생성하는 로직 필요
  //   // 지금은 에디터의 내용을 그대로 저장
  //   saveWorkflowFile(actionId, workflowContent)
  //     .then(() => {
  //       alert("Workflow saved successfully!");
  //     })
  //     .catch((err) => {
  //       alert("Failed to save workflow.");
  //       console.error(err);
  //     });
  // };

  // --- Render ---
  if (!actionId) {
    return (
      <div className="editor-placeholder">
        Select an action to edit workflow
      </div>
    );
  }

  if (isLoading) {
    return <div className="editor-placeholder">Loading workflow...</div>;
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <div className="main-header">
          <h1 className="main-title">Workflow Editor</h1>
          {/* 저장 버튼 등 추가 가능 */}
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
