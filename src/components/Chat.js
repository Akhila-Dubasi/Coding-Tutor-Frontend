import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabaseClient';
import './Chat.css';
import '../App.css';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch all conversations on mount or when search query changes
  useEffect(() => {
    fetchConversations();
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
      const url = searchQuery
        ? `${backendUrl}/conversations?search=${encodeURIComponent(searchQuery)}`
        : `${backendUrl}/conversations`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Load messages for the selected conversation
  const selectConversation = async (id) => {
    setActiveConversationId(id);
    setLoadingHistory(true);
    setChat([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${backendUrl}/conversations/${id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const messagesData = await res.json();
        // Map backend schema to local chat message state
        const formattedChat = messagesData.map((m) => ({
          sender: m.sender,
          text: m.content,
        }));
        setChat(formattedChat);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setChat([]);
    setMessage('');
  };

  // Handle deleting a conversation
  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation(); // Avoid triggering selectConversation
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${backendUrl}/conversations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Remove from local state
        setConversations(conversations.filter((c) => c.id !== id));
        // If we deleted the active conversation, clear the chat panel
        if (activeConversationId === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    const newChat = [...chat, { sender: 'user', text: userMessage }];
    setChat(newChat);
    setMessage('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          prompt: userMessage,
          conversation_id: activeConversationId, // Sends active ID (null if new session)
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized session. Please log in again.');
        } else if (res.status === 403) {
          throw new Error('Forbidden. You do not have permission.');
        }
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();

      // Display response
      setChat([
        ...newChat,
        {
          sender: 'ai',
          text: data.response,
        },
      ]);

      // If it was a new conversation, set the returned ID as active and refresh sidebar list
      if (!activeConversationId) {
        setActiveConversationId(data.conversation_id);
      }
      fetchConversations();
    } catch (error) {
      setChat([
        ...newChat,
        {
          sender: 'ai',
          text: `❌ Error: ${error.message || 'Error connecting to backend.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Timestamp formatting helper
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-layout">
      {/* Left Sidebar: Conversations & Search */}
      <div className="chat-sidebar">
        <button className="new-chat-btn" onClick={handleNewChat}>
          ➕ New Chat Session
        </button>

        <div className="search-box-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '15px' }}>
              No chats found.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv.id)}
              >
                <div className="conversation-info">
                  <div className="conversation-title">{conv.title}</div>
                  <div className="conversation-time">{formatTimestamp(conv.updated_at)}</div>
                </div>
                <button
                  className="delete-chat-btn"
                  title="Delete Conversation"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Main Screen: Chat Messages Area */}
      <div className="chat-main">
        {loadingHistory ? (
          <div className="no-chat-state">
            <h3>Loading conversation logs...</h3>
          </div>
        ) : (
          <>
            <div className="chat-messages-container">
              {chat.length === 0 ? (
                <div className="no-chat-state">
                  <h2>👋 Welcome back to AI Mentor</h2>
                  <p>Start a new discussion thread or select an existing one from the sidebar list.</p>
                  {!activeConversationId && (
                    <button className="auth-btn" onClick={() => selectConversation(null)} style={{ display: 'none' }}>
                      Start
                    </button>
                  )}
                </div>
              ) : (
                chat.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${
                      msg.sender === 'user' ? 'user-message' : 'ai-message'
                    }`}
                  >
                    <div className="avatar">
                      {msg.sender === 'user' ? '🧑' : '🤖'}
                    </div>

                    <div className="content">
                      {msg.sender === 'ai' ? (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))
              )}

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
                  if (e.key === 'Enter') sendMessage();
                }}
              />

              <button onClick={sendMessage}>Send ➜</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
