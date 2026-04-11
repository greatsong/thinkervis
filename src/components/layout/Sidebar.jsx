import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/chat', label: '코칭 대화', icon: '💬' },
  { path: '/', label: '점검하기', icon: '🔍' },
  { path: '/history', label: '점검 이력', icon: '📋' },
  { path: '/growth', label: '성장 여정', icon: '📈' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* 오버레이 */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 md:z-auto
          w-64 bg-white border-r border-gray-200 h-screen flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✦</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">팅커비스</h1>
              <p className="text-xs text-gray-500">문제해결 코치</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            팅커벨의 활기 + 자비스의 분석력<br />당신의 성장 파트너
          </p>
        </div>
      </aside>
    </>
  );
}
