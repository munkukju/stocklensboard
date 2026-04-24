'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import TradeList from './TradeList';
import PortfolioView from './PortfolioView';

type Tab = 'journal' | 'portfolio';

export default function DashboardShell() {
  // 초기 탭: 포트폴리오 (시각적 임팩트가 큰 화면을 먼저 보여줌)
  const [tab, setTab] = useState<Tab>('portfolio');

  return (
    <div className="sl-layout">
      <Sidebar current={tab} onChange={setTab} />
      <main className="sl-layout__content">
        {tab === 'journal'   && <TradeList />}
        {tab === 'portfolio' && <PortfolioView />}
      </main>
    </div>
  );
}
