import { RunStatus } from "../Sidebar/types";

export type Run = {
  id: string;
  event: string;
  status: RunStatus;
  branch: string;
  startedAt: Date;
  duration: number;
};

export default function HistoryTableRow(props: Run) {
  const { /*id,*/ event, status, branch, startedAt, duration } = props;

  // let statusColor = "#FFFFFF";
  // if (status === "success") statusColor = "#00FF00";
  // else if (status === "running") statusColor = "#FFA500";
  // else if (status === "failed") statusColor = "#FF0000";

  // const cellPadding = "12px";

  return (
    <tr
      onClick={() => {
        console.log("clicked"); // TODO: Navigate to the run details page
      }}
    >
      <td>{event}</td>
      <td>{status}</td>
      <td>{branch}</td>
      <td>{formatRelativeTime(startedAt)}</td>
      <td>{formatDuration(duration)}</td>
    </tr>
  );
}

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minutes ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hours ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} days ago`;
  }
}

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
