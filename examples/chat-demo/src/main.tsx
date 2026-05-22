import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

type ChatMessage = {
  body: string;
  id: string;
  receivedAt: string;
};

function ChatDemo() {
  const [draft, setDraft] = useState("Hello from chat demo");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("connecting");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:17787");
    socketRef.current = socket;

    socket.addEventListener("open", () => setStatus("connected"));
    socket.addEventListener("close", () => setStatus("closed"));
    socket.addEventListener("error", () => setStatus("error"));
    socket.addEventListener("message", (event: MessageEvent<string>) => {
      setMessages((current) => [
        {
          body: event.data,
          id: crypto.randomUUID(),
          receivedAt: new Date().toLocaleTimeString(),
        },
        ...current,
      ]);
    });

    return () => socket.close(1000, "Chat demo unmounted");
  }, []);

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = draft.trim();

    if (!payload || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(payload);
    setDraft("");
  }

  return (
    <main>
      <section className="panel">
        <p className="eyebrow">SocketLens example</p>
        <h1>Chat demo</h1>
        <p className="muted">Run the echo server first, then send messages through this browser client.</p>
        <div className="status">Status: {status}</div>
        <form onSubmit={sendMessage}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit">Send</button>
        </form>
        <div className="messages">
          {messages.map((message) => (
            <article key={message.id}>
              <time>{message.receivedAt}</time>
              <pre>{message.body}</pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChatDemo />
  </React.StrictMode>,
);
