import React from 'react';
import './YamlViewer.css';

interface YamlViewerProps {
  yamlContent: string;
  highlightedLines?: number[];
}

const YamlViewer: React.FC<YamlViewerProps> = ({ yamlContent, highlightedLines = [] }) => {
  // 클립보드에 복사하는 함수
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      alert('YAML이 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  // YAML 구문 하이라이팅 함수
  const highlightYaml = (yaml: string) => {
    return yaml
      // 주석 (먼저 처리하여 주석 내용이 하이라이팅되지 않도록)
      .replace(/(#.*)$/gm, '<span class="yaml-comment">$1</span>')
      // GitHub 표현식
      .replace(/\$\{\{([^}]+)\}\}/g, '<span class="yaml-expression">${{$1}}</span>')
      // 문자열 값 (쌍따옴표와 작은따옴표 모두 인식)
      .replace(/"([^"]*)"/g, '<span class="yaml-string">"$1"</span>')
      .replace(/'([^']*)'/g, '<span class="yaml-string">\'$1\'</span>')
      // 배열 표시
      .replace(/\[([^\]]*)\]/g, '<span class="yaml-array">[$1]</span>')
      // YAML 키워드 (실제 GitHub Actions YAML 키워드만 포함)
      .replace(/^(\s*)(on|jobs|runs-on|steps|uses|name|with|run|env|permissions|concurrency|strategy|needs|outputs|if|types|branches|tags|paths|schedule|workflow_dispatch|workflow_call|inputs|outputs|description|required|default|type|timeout-minutes|continue-on-error|matrix|fail-fast|max-parallel|environment|secrets|push|pull_request|pull_request_target|release|issues|issue_comment|workflow_run|repository_dispatch|schedule|contents|packages|deployments|security-events|statuses|checks|actions|id-token|discussions|pages|issues|pull-requests|read|write|none|group|cancel-in-progress|shell|working-directory|defaults|options|choice)(\s*):/gm, '$1<span class="yaml-keyword">$2</span>$3:')
      // 숫자
      .replace(/:\s*(\d+)\b/g, ': <span class="yaml-number">$1</span>')
      // 들여쓰기 (공백을 &nbsp;로 변환)
      .replace(/^(\s+)/gm, (match) => '&nbsp;'.repeat(match.length));
  };

  // 줄별로 분리하여 줄 번호와 함께 렌더링
  const renderYamlWithLineNumbers = () => {
    const lines = yamlContent.split('\n');
    const minLines = 40; // 최소 40줄 보장
    
    // 40줄보다 적으면 빈 줄로 채우기
    const paddedLines = [...lines];
    while (paddedLines.length < minLines) {
      paddedLines.push('');
    }
    
    return paddedLines.map((line, index) => {
      const lineNumber = index + 1;
      const isHighlighted = highlightedLines.includes(lineNumber);
      const isEmptyLine = line === '';
      
      return (
        <div 
          key={index} 
          className={`yaml-line ${isHighlighted ? 'highlighted' : ''} ${isEmptyLine ? 'empty-line' : ''}`}
        >
          <span className="line-number">{lineNumber}</span>
          <span 
            className="line-content"
            dangerouslySetInnerHTML={{ 
              __html: isEmptyLine ? '' : highlightYaml(line) 
            }}
          />
        </div>
      );
    });
  };

  // 빈 콘텐츠일 때는 기본 템플릿 표시
  if (!yamlContent.trim()) {
    const defaultTemplate = `name: My Workflow
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test`;

    const lines = defaultTemplate.split('\n');
    const minLines = 40;
    const paddedLines = [...lines];
    while (paddedLines.length < minLines) {
      paddedLines.push('');
    }

    return (
      <div className="yaml-viewer">
        <div className="yaml-header">
          <span className="yaml-title">workflow.yaml</span>
          <div className="yaml-actions">
            <button className="yaml-btn yaml-btn-copy" onClick={copyToClipboard}>Copy</button>
          </div>
        </div>
        <div className="yaml-content">
          <div className="yaml-code-container">
            {paddedLines.map((line, index) => {
              const lineNumber = index + 1;
              const isEmptyLine = line === '';
              
              return (
                <div 
                  key={index} 
                  className={`yaml-line ${isEmptyLine ? 'empty-line' : ''}`}
                >
                  <span className="line-number">{lineNumber}</span>
                  <span 
                    className="line-content"
                    dangerouslySetInnerHTML={{ 
                      __html: isEmptyLine ? '' : highlightYaml(line) 
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="yaml-viewer">
      <div className="yaml-header">
        <span className="yaml-title">workflow.yaml</span>
        <div className="yaml-actions">
          <button className="yaml-btn yaml-btn-copy" onClick={copyToClipboard}>Copy</button>
        </div>
      </div>
      <div className="yaml-content">
        <div className="yaml-code-container">
          {renderYamlWithLineNumbers()}
        </div>
      </div>
    </div>
  );
};

export default YamlViewer;
