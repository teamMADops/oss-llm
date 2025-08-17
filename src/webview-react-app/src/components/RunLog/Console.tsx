interface ConsoleProps {
  messages: string[];
}

export default function Console(props: ConsoleProps) {
  const { messages } = props;

  return (
    <div>
      <code>
        {messages.map((message) => (
          <div key={message}>{message}</div>
        ))}
      </code>
    </div>
  );
}
