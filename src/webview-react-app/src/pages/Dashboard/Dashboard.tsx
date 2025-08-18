import React from 'react';
import './Dashboard.css';

interface DashboardPageProps {
  actionId: string | null;
  isSidebarOpen: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ actionId, isSidebarOpen }) => {
  return (
    <main className={`dashboard-main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
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
