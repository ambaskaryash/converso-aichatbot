import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    CONVERSO_API_KEY?: string;
  }
}

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  timestamp?: number;
};

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());
  const SESSION_KEY = `converso_session_${projectId}`;
  const MESSAGES_KEY = `converso_messages_${projectId}`;

  type ServerMessage =
    | { type: 'token'; content: string }
    | { type: 'done' }
    | { type: 'error'; error: string };

  const handleMessage = useCallback((data: ServerMessage) => {
    if (data.type === 'token') {
      setIsTyping(false);
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: lastMsg.content + data.content },
          ];
        } else {
          return [
            ...prev,
            {
              id: uuidv4(),
              role: 'assistant',
              content: data.content,
              isStreaming: true,
              timestamp: Date.now(),
            },
          ];
        }
      });
    } else if (data.type === 'done') {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.isStreaming) {
          return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
        }
        return prev;
      });
      setIsTyping(false);
    } else if (data.type === 'error') {
      console.error('Server error:', data.error);
      setIsTyping(false);
    }
  }, []);

  // Load persisted session/messages
  useEffect(() => {
    try {
      const existingSession = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
      if (existingSession) {
        sessionIdRef.current = existingSession;
      } else {
        window.localStorage.setItem(SESSION_KEY, sessionIdRef.current);
      }
      const existingMessages = typeof window !== 'undefined' ? window.localStorage.getItem(MESSAGES_KEY) : null;
      if (existingMessages) {
        const parsed = JSON.parse(existingMessages) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      void 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Persist messages
  useEffect(() => {
    try {
      const capped = messages.slice(-100);
      window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(capped));
    } catch {
      void 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const apiBase =
      (typeof window !== 'undefined' && (window as unknown as Record<string, string>).CONVERSO_API_BASE_URL) ||
      (typeof window !== 'undefined' && window.localStorage.getItem('converso_api_base')) ||
      'http://localhost:8000/api/v1';
    const baseUrl = apiBase.replace(/^http/, 'ws');
    const apiKey =
      (typeof window !== 'undefined' && window.CONVERSO_API_KEY) ||
      (typeof window !== 'undefined' && window.localStorage.getItem('converso_api_key')) ||
      '';
    const wsUrl = `${baseUrl}/chat/${projectId}/ws${apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : ''}`;

    console.log('Connecting to', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to Chat WebSocket');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from Chat WebSocket');
      setIsConnected(false);
      // Implement reconnection logic here if needed
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage;
        handleMessage(data);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [projectId, handleMessage]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    // Add user message immediately
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Send to server
    wsRef.current.send(JSON.stringify({
      message: content,
      session_id: sessionIdRef.current
    }));
  }, []);

  return {
    messages,
    sendMessage,
    isConnected,
    isTyping
  };
}
