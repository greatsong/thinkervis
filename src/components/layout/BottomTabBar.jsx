import { NavLink } from 'react-router-dom';

const TABS = [
  { path: '/chat', label: '채팅', icon: '💬' },
  { path: '/', label: '점검', icon: '🔍' },
  { path: '/history', label: '이력', icon: '📋' },
  { path: '/growth', label: '성장', icon: '📈' },
];

export default function BottomTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex justify-around items-center h-14">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-amber-600'
                  : 'text-gray-400 active:text-gray-600'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
