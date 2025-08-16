import React from 'react';

interface YamlViewerProps {
  yamlContent: string;
  highlightedLines?: number[];
}

const YamlViewer: React.FC<YamlViewerProps> = ({ yamlContent, highlightedLines = [] }) => {
  const lines = yamlContent.split('\n');

  return (
    <div className="yaml-viewer-container">
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
        <code>
          {lines.map((line, index) => (
            <span 
              key={index} 
              style={{
                display: 'block',
                backgroundColor: highlightedLines.includes(index + 1) ? 'rgba(255, 255, 0, 0.2)' : 'transparent'
              }}
            >
              {line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
};

export default YamlViewer;