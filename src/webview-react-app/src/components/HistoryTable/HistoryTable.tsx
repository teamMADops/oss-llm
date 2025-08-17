import HistoryTableHead from "./HistoryTableHead";
import HistoryTableRow, { Run } from "./HistoryTableRow";

interface HistoryTableProps {
  runs: Run[];
}

export default function HistoryTable(props: HistoryTableProps) {
  const { runs } = props;

  return (
    <table style={{ backgroundColor: "#000000" }}>
      <HistoryTableHead />
      <tbody>
        {runs.map((run, index) => (
          <HistoryTableRow key={index} {...run} />
        ))}
      </tbody>
    </table>
  );
}
