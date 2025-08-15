import React from 'react';
import './YamlViewer.css';

interface YamlViewerProps {
  yamlContent: string;
}

const YamlViewer: React.FC<YamlViewerProps> = ({ yamlContent }) => {
  // YAML 구문 하이라이팅 함수
  const highlightYaml = (yaml: string) => {
    return yaml
      // 키워드 (on, jobs, runs-on, steps, uses, name, with, run)
      .replace(/\b(on|jobs|runs-on|steps|uses|name|with|run|env|permissions|concurrency|strategy|needs|outputs|if|types|branches|tags|schedule|release|workflow_dispatch|inputs|description|required|default|choice|options|timeout-minutes|matrix|fail-fast|os|node-version|test-type|environment|secrets|github|workflow|ref|event|push|pull_request|opened|synchronize|reopened|published|contents|packages|security-events|actions|read|write|group|cancel-in-progress|checkout|setup-node|cache|npm|registry-url|ci|audit|lint|format|prettier|typescript|type-check|test|coverage|codecov|upload-artifact|retention-days|trivy|vulnerability|scanner|sarif|codeql|deploy|staging|production|notify|slack|create-release|tag_name|release_name|body|draft|prerelease)\b/g, '<span class="yaml-keyword">$1</span>')
      // 문자열 값 (따옴표로 감싸진 값들)
      .replace(/"([^"]*)"/g, '<span class="yaml-string">"$1"</span>')
      // 배열 표시
      .replace(/\[([^\]]*)\]/g, '<span class="yaml-array">[$1]</span>')
      // 숫자
      .replace(/\b(\d+)\b/g, '<span class="yaml-number">$1</span>')
      // 주석
      .replace(/(#.*)$/gm, '<span class="yaml-comment">$1</span>')
      // GitHub 표현식
      .replace(/\$\{\{([^}]+)\}\}/g, '<span class="yaml-expression">${{$1}}</span>')
      // 들여쓰기 (공백을 &nbsp;로 변환)
      .replace(/^(\s+)/gm, (match) => '&nbsp;'.repeat(match.length));
  };

  // 줄 수 계산
  const lineCount = yamlContent.split('\n').length;

  return (
    <div className="yaml-viewer">
      <div className="yaml-header">
        <span className="yaml-title">workflow.yml</span>
        <div className="yaml-actions">
          <button className="yaml-btn yaml-btn-copy">Copy</button>
          <button className="yaml-btn yaml-btn-format">Format</button>
        </div>
      </div>
      <div className="yaml-content">
        {/* 줄 번호 */}
        <div className="line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="line-number">
              {i + 1}
            </div>
          ))}
        </div>
        {/* YAML 코드 */}
        <div className="yaml-code-wrapper">
          <pre 
            className="yaml-code"
            dangerouslySetInnerHTML={{ 
              __html: highlightYaml(yamlContent) 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default YamlViewer; 