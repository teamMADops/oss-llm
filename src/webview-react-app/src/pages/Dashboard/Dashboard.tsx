import React from 'react';
import './Dashboard.css';

interface DashboardPageProps {
  actionId: string | null;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ actionId }) => {
  return (
    <main className="dashboard-main-content">
      <h1 className="dashboard-title">Dashboard</h1>
      {actionId ? (
        <p>Displaying dashboard for action: {actionId}</p>
      ) : (
        <p>No action selected.</p>
      )}
    </main>
  );
};

export default DashboardPage;
