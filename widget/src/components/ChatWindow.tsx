import React, { useRef, useEffect, useState } from 'react';
import { Send, X, MoreVertical, ThumbsUp, ThumbsDown, Paperclip } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import clsx from 'clsx';
import { Button3D } from 'react-3d-button';

interface ChatWindowProps {
  projectId: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ projectId, onClose }) => {
  const { messages, sendMessage, isConnected, isTyping, submitFeedback, uploadFile } = useChat(projectId);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, number>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const text = await uploadFile(file);
      if (text) {
        setInputValue((prev) => (prev ? prev + '\n\n' + text : text));
      }
    }
  };

  const handleFeedback = (messageId: string, score: number) => {
      submitFeedback(messageId, score);
      setFeedbackGiven(prev => ({ ...prev, [messageId]: score }));
  };

  return (
    <div className="cw-root">
      <div className="relative">
        <div className="cw-header">
          <div className="cw-top">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="cw-avatars" style={{ display: 'flex' }}>
                <div className="cw-avatar" style={{ background: '#fde047' }} />
                <div className="cw-avatar" style={{ background: '#f472b6', marginLeft: -8 }} />
                <div className="cw-avatar" style={{ background: '#93c5fd', marginLeft: -8 }} />
              </div>
              <h3 className="cw-title">Chat with us</h3>
            </div>
            <div className="cw-actions">
              <MoreVertical className="w-5 h-5" />
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="cw-status">We&apos;re online</div>
        </div>
      </div>

      <div className="cw-messages">
        {messages.length === 0 && (
          <div className="cw-empty">
            <p>👋 Hi there! How can I help you today?</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={clsx("cw-msg", msg.role === 'user' ? "cw-msg-user" : "cw-msg-assistant")}>
            <div className={clsx("cw-bubble", msg.role === 'user' ? "cw-bubble-user" : "cw-bubble-assistant")}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && !msg.isStreaming && (
                <div className="flex gap-2 mt-1 ml-1">
                   <button 
                     onClick={() => handleFeedback(msg.id, 1)}
                     className={clsx("p-1 hover:bg-gray-100 rounded", feedbackGiven[msg.id] === 1 ? "text-green-600" : "text-gray-400")}
                     disabled={!!feedbackGiven[msg.id]}
                   >
                       <ThumbsUp size={14} />
                   </button>
                   <button 
                     onClick={() => handleFeedback(msg.id, -1)}
                     className={clsx("p-1 hover:bg-gray-100 rounded", feedbackGiven[msg.id] === -1 ? "text-red-600" : "text-gray-400")}
                     disabled={!!feedbackGiven[msg.id]}
                   >
                       <ThumbsDown size={14} />
                   </button>
                </div>
            )}
            {msg.role === 'assistant' && msg.timestamp && (
              <div className="cw-meta">
                Converso AI • {new Date(msg.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="cw-msg cw-msg-assistant">
            <div className="cw-typing">
              <div className="cw-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="cw-input">
        <div className="cw-input-row">
          <input 
             type="file" 
             ref={fileInputRef}
             className="hidden" 
             onChange={handleFileUpload}
             accept=".txt,.md,.json,.csv"
          />
          <button 
            type="button" 
            className="p-2 text-gray-400 hover:text-gray-600"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
             <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type in a message..."
            className="cw-input-box"
            disabled={!isConnected}
          />
          <div>
            <Button3D
              type="primary"
              disabled={!isConnected || !inputValue.trim()}
              onPress={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send className="w-4 h-4" />
              </span>
            </Button3D>
          </div>
        </div>
        {!isConnected && <p className="cw-connect">Connecting...</p>}
      </form>
    </div>
  );
};
