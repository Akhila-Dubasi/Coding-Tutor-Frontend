import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;

    const newChat = [...chat, { sender: "user", text: userMessage }];
    setChat(newChat);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await res.json();

      setChat([
        ...newChat,
        {
          sender: "ai",
          text: data.response,
        },
      ]);
    } catch (error) {
      setChat([
        ...newChat,
        {
          sender: "ai",
          text: "❌ Error connecting to backend.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🤖 Akhila AI Coding Mentor</h1>
        <p>Your Personal Programming Assistant</p>
      </div>

      <div className="chat-box">
        {chat.length === 0 && (
          <div className="welcome">
            <h2>👋 Welcome</h2>
            <p>Ask coding questions, debugging help, DSA problems, or project guidance.</p>
          </div>
        )}

        {chat.map((msg, index) => (
          <div
            key={index}
            className={`message ${
              msg.sender === "user" ? "user-message" : "ai-message"
            }`}
          >
            <div className="avatar">
              {msg.sender === "user" ? "🧑" : "🤖"}
            </div>

            <div className="content">
              {msg.sender === "ai" ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      <div className="input-box">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask any coding question..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />

        <button onClick={sendMessage}>Send ➜</button>
      </div>
    </div>
  );
}

export default App;