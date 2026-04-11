import { useState, useRef, useEffect, useCallback } from 'react';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [coachingInfo, setCoachingInfo] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 세션 목록 로드
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      setSessions(data.sessions || []);
      return data.sessions || [];
    } catch { return []; }
  }, []);

  // 특정 세션의 메시지 로드
  const loadSession = async (sid) => {
    setCurrentSession(sid);
    try {
      const res = await fetch(`/api/chat?sessionId=${sid}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  };

  // 초기 로드: 마지막 세션 이어가기 또는 새 세션
  useEffect(() => {
    (async () => {
      const list = await loadSessions();
      if (list.length > 0) {
        await loadSession(list[0].id);
      } else {
        startNewSession();
      }
      setInitialLoading(false);
    })();
  }, []);

  const startNewSession = () => {
    const sid = `s-${Date.now()}`;
    setCurrentSession(sid);
    setMessages([]);
    sendMessageDirect(sid, '안녕 팅커비스! 오늘도 코칭 부탁해!');
  };

  const sendMessageDirect = async (sid, text) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sid }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
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
            const d = line.slice(6);
            if (d === '[DONE]') continue;
            try {
              const parsed = JSON.parse(d);
              if (parsed.type === 'text') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') last.content += parsed.content;
                  return [...updated];
                });
              }
            } catch {}
          }
        }
      } else {
        const data = await res.json();
        if (data.text) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') last.content = data.text;
            return [...updated];
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') last.content = '연결에 문제가 생겼어요. 다시 시도해주세요.';
        return [...updated];
      });
    }
    setLoading(false);
    loadSessions();
    inputRef.current?.focus();
  };

  const sendMessage = (text) => {
    if (currentSession) sendMessageDirect(currentSession, text);
  };

  const endSession = async () => {
    if (currentSession) {
      await fetch(`/api/chat/${currentSession}`, { method: 'DELETE' });
    }
    await loadSessions();
    startNewSession();
    setShowSidebar(false);
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  const cleanText = (text) => text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#{1,3}\s/gm, '').replace(/^- /gm, '• ');

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 animate-pulse">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto relative">
      {/* 세션 사이드패널 */}
      {showSidebar && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowSidebar(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-xl flex flex-col">
            <div className="p-4 border-b font-bold text-gray-900 flex justify-between items-center">
              <span>대화 목록</span>
              <button onClick={() => setShowSidebar(false)} className="text-gray-400 text-xl">&times;</button>
            </div>

            {/* 업로드 상태 */}
            <div className="px-4 py-3 border-b bg-gray-50">
              {coachingInfo ? (
                <div className="text-xs text-gray-600">
                  <div className="font-medium text-green-600 mb-1">점검 데이터 업로드됨</div>
                  <div>기간: {coachingInfo.period?.from} ~ {coachingInfo.period?.to}</div>
                  <div>세션 {coachingInfo.summary?.sessionsAnalyzed}개 | 프롬프트 {coachingInfo.summary?.promptsAnalyzed}개</div>
                </div>
              ) : (
                <div className="text-xs text-amber-600">
                  점검 데이터 없음 (로컬에서 점검 후 업로드 필요)
                </div>
              )}
            </div>

            {/* 새 대화 버튼 */}
            <button
              onClick={() => { endSession(); }}
              className="mx-4 mt-3 py-2 rounded-lg border border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50"
            >
              + 새 대화
            </button>

            {/* 세션 목록 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={async () => {
                    await loadSession(s.id);
                    setShowSidebar(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm ${
                    s.id === currentSession ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium truncate">{s.title || '대화'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.messageCount}개 메시지 · {s.updatedAt?.slice(5, 10)}
                  </div>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-4">아직 대화가 없어요</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSidebar(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="text-lg text-purple-500 font-bold">✦</span>
          <div>
            <h1 className="text-sm font-bold text-gray-900">팅커비스</h1>
            <p className="text-[10px] text-gray-400">문제해결 코치</p>
          </div>
        </div>
        <button onClick={endSession} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">새 대화</button>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.slice(1).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-1 mr-1.5">
                <span className="text-[10px] text-purple-600 font-bold">✦</span>
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-br-md'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
            }`}>
              {msg.content ? (
                <span className="whitespace-pre-wrap">{cleanText(msg.content)}</span>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 - 탭 바 위에 배치 */}
      <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-gray-200 bg-white shrink-0 mb-14 md:mb-0">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="팅커비스에게 물어보세요..."
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              loading || !input.trim() ? 'bg-gray-100 text-gray-300' : 'bg-purple-600 text-white active:scale-95'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
