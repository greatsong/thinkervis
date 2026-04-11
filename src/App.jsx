import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import BottomTabBar from './components/layout/BottomTabBar';
import HomePage from './pages/HomePage';
import CoachingPage from './pages/CoachingPage';
import GrowthJourneyPage from './pages/GrowthJourneyPage';
import HistoryPage from './pages/HistoryPage';
import ChatPage from './pages/ChatPage';

function Layout() {
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  return (
    <div className="flex h-[100dvh]">
      {/* 데스크톱 사이드바 */}
      <Sidebar />

      {/* 콘텐츠 영역 */}
      <main className={`flex-1 flex flex-col min-w-0 ${isChat ? '' : 'overflow-y-auto'}`}>
        <div className={`flex-1 ${isChat ? 'min-h-0' : 'p-4 md:p-8 pb-20 md:pb-8'}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/coaching/:id" element={<CoachingPage />} />
            <Route path="/growth" element={<GrowthJourneyPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
      </main>

      {/* 모바일 하단 탭 바 */}
      <BottomTabBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
