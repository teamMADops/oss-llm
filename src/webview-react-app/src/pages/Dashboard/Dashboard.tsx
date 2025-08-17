import "./Dashboard.css";
import { useState, useEffect } from "react";
import RunLog from "@/components/RunLog/RunLog";

interface DashboardPageProps {
  actionId: string | null;
}

export default function DashboardPage(props: DashboardPageProps) {
  const { actionId } = props;
  const [latestRunId, setLatestRunId] = useState<string | null>("test");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: apply real fetch
    const fetchLatestRunId = async () => {
      const response = await fetch(`/api/runs/latest/${actionId}`);
      const data = await response.json();
      setLatestRunId(data.id);
    };

    setIsLoading(true);
    fetchLatestRunId();
    setIsLoading(false);
  }, []);

  if (latestRunId === null) return null;

  return isLoading ? null : (
    <main className="dashboard-main-content">
      <h1 className="dashboard-title">Dashboard</h1>
      <RunLog runId={latestRunId} />
    </main>
  );
}
