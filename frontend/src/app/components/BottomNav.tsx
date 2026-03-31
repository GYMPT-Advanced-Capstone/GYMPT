import { useNavigate, useLocation } from 'react-router';
import { Home, Users, BarChart2, User } from 'lucide-react';

const navItems = [
  { label: '홈', icon: Home, path: '/main' },
  { label: '커뮤니티', icon: Users, path: '/community' },
  { label: '분석', icon: BarChart2, path: '/analysis' },
  { label: '마이페이지', icon: User, path: '/mypage' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '390px',
        backgroundColor: '#1E1E22',
        borderTop: '1px solid #2C2C30',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around" style={{ height: 64 }}>
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = 
            location.pathname === path || 
            (path === '/community' && location.pathname === '/create-post');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-1"
              style={{
                flex: 1,
                height: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#3FFDD4' : '#FFFFFF',
                opacity: isActive ? 1 : 0.55,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.2,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
