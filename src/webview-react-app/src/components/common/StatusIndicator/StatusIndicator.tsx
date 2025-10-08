
import React from 'react';
import './StatusIndicator.css';

interface StatusIndicatorProps {
  status: string;
  conclusion: string | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ conclusion }) => {
  if (conclusion === 'failure') {
    return (
      <div className="status-indicator status-failed">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="#FF0000" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  
  if (conclusion === 'success') {
    return (
      <div className="status-indicator status-success">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#00AA00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  
  return (
    <div className="status-indicator status-pending">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
        <path d="M6 2V6L8.5 8.5" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};
