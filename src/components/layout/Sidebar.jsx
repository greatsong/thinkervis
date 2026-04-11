import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/chat', label: '코칭 대화', icon: '💬' },
  { path: '/', label: '점검하기', icon: '🔍' },
  { path: '/history', label: '점검 이력', icon: '📋' },
  { path: '/growth', label: '성장 여정', icon: '📈' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 h-screen flex-col shrink-0">
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
  );
}
