'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

type Tab = 'journal' | 'portfolio';

interface SidebarProps {
  current: Tab;
  onChange: (tab: Tab) => void;
}

export default function Sidebar({ current, onChange }: SidebarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const active = (t: Tab) => current === t ? 'sl-nav__item--active' : '';

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      clear();                       // Zustand 세션 비우기
      router.push('/login');
    } catch (err) { console.error(err); alert('로그아웃 실패'); }
  };

  return (
    <aside className="sl-sidebar">
      <h1 className="sl-sidebar__logo">StockLens</h1>

      <nav className="sl-nav">
        <button className={`sl-nav__item ${active('journal')}`}   onClick={() => onChange('journal')}>📒 매매일지</button>
        <button className={`sl-nav__item ${active('portfolio')}`} onClick={() => onChange('portfolio')}>📊 포트폴리오</button>
      </nav>

      <div className="sl-sidebar__footer">
        {user && <span className="sl-sidebar__user">{user.name}님</span>}
        <button className="sl-btn" onClick={handleLogout}>로그아웃</button>
      </div>
    </aside>
  );
}
