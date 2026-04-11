import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(`s-${Date.now()}`);
  const initRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      sendMessage('안녕 팅커비스! 오늘도 코칭 부탁해!');
    }
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current }),
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE 스트리밍
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') last.content += parsed.content;
                  return [...updated];
                });
              }
            } catch {}
          }
        }
      } else {
        // JSON fallback
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') last.content = data.text;
          return [...updated];
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') last.content = '연결에 문제가 생겼어요. 다시 시도해주세요.';
        return [...updated];
      });
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  const resetChat = async () => {
    try { await fetch(`/api/chat?sessionId=${sessionId.current}`, { method: 'DELETE' }); } catch {}
    sessionId.current = `s-${Date.now()}`;
    setMessages([]);
    setTimeout(() => sendMessage('안녕 팅커비스! 새로운 대화 시작하자!'), 100);
  };

  // ** 등 마크다운 기호를 일반 텍스트로 정리
  const cleanMarkdown = (text) => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#{1,3}\s/gm, '')
      .replace(/^- /gm, '• ');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl text-purple-500 font-bold">✦</span>
          <div>
            <h1 className="text-base font-bold text-gray-900">팅커비스</h1>
            <p className="text-xs text-gray-400">문제해결 코치</p>
          </div>
        </div>
        <button onClick={resetChat} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">새 대화</button>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.slice(1).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1 mr-2">
                <span className="text-xs text-purple-600 font-bold">✦</span>
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-md'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
            }`}>
              {msg.content ? (
                <span className="whitespace-pre-wrap">{cleanMarkdown(msg.content)}</span>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="팅커비스에게 물어보세요..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
            style={{ maxHeight: '120px' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              loading || !input.trim() ? 'bg-gray-100 text-gray-300' : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
