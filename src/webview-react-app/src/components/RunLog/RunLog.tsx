import { Run } from "../HistoryTable/HistoryTableRow";
import HistoryTable from "../HistoryTable/HistoryTable";
import Console from "./Console";
import { useState, useEffect } from "react";

interface RunLogProps {
  runId: string;
}

const mockRun: Run = {
  id: "1",
  event: "push",
  status: "failed" as const,
  branch: "main",
  startedAt: new Date("2025-08-15T12:00:34Z"),
  duration: 120000, // 2 minutes in milliseconds
};

const mockLogs = [
  "2025-08-15T12:00:34Z [INFO] Starting run",
  "2025-08-15T12:00:35Z [INFO] Running step 1",
  "2025-08-15T12:00:36Z [INFO] Step 1 completed",
  "2025-08-15T12:00:37Z [INFO] Running step 2",
  "2025-08-15T12:00:38Z [INFO] Step 2 completed",
  "2025-08-15T12:00:39Z [INFO] Run completed",
];

const mockAiMessage = "Run successfully completed\nExit code: 1";

export default function RunLog(props: RunLogProps) {
  const { runId } = props;

  const [run, setRun] = useState<Run | null>(mockRun);
  const [logs, setLogs] = useState<string[]>(mockLogs);
  const [aiMessage, setAiMessage] = useState<string>(mockAiMessage);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: apply real fetch
    const fetchRun = async () => {
      const response = await fetch(`/api/runs/${runId}`);
      const data = await response.json();
      setRun(data);
    };

    const fetchLogs = async () => {
      const response = await fetch(`/api/runs/${runId}/logs`);
      const data = await response.json();
      setLogs(data);
    };

    const fetchAiMessage = async () => {
      const response = await fetch(`/api/runs/${runId}/ai-message`);
      const data = await response.json();
      setAiMessage(data);
    };

    setIsLoading(true);
    fetchRun();
    fetchLogs();
    fetchAiMessage();
    setIsLoading(false);
  }, [runId]);

  if (run === null) return null;

  return isLoading ? null : (
    <div>
      <h1>Run Log</h1>
      <h2>Run Details</h2>
      <HistoryTable runs={run ? [run] : []} />
      <h3>Detailed Logs</h3>
      <Console messages={logs} />
      <h3>Analysis</h3>
      <Console messages={aiMessage.split("\n")} />
    </div>
  );
}
