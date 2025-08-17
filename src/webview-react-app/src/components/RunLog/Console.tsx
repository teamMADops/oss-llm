interface ConsoleProps {
  messages: string[];
}

export default function Console(props: ConsoleProps) {
  const { messages } = props;

  return (
    <div>
      <code>
        {messages.map((message) => (
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </code>
    </div>
  );
}
