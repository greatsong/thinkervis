import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import CoachingPage from './pages/CoachingPage';
import GrowthJourneyPage from './pages/GrowthJourneyPage';
import HistoryPage from './pages/HistoryPage';
import ChatPage from './pages/ChatPage';

function Layout() {
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  if (isChat) {
    return (
      <Routes>
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/coaching/:id" element={<CoachingPage />} />
          <Route path="/growth" element={<GrowthJourneyPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
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
