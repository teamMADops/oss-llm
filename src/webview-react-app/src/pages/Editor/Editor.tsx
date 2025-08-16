import React from 'react';
import './Editor.css';

interface EditorPageProps {
    actionId: string | null;
}

const EditorPage: React.FC<EditorPageProps> = ({ actionId }) => {
  return (
    <main className="editor-main-content">
      <h1 className="editor-title">Workflow Editor</h1>
      {actionId ? (
        <p>Editing workflow for action: {actionId}</p>
      ) : (
        <p>No action selected.</p>
      )}
    </main>
  );
};

export default EditorPage;
