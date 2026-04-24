'use client';
import type { PortfolioSummary } from '@/lib/types';

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  // 손익 양/음에 따라 색상 클래스
  const pnlClass = summary.total_pnl >= 0 ? 'sl-profit' : 'sl-loss';

  return (
    <div className="sl-summary">
      <div className="sl-card">
        <div className="sl-card__title">총 원금</div>
        <div className="sl-card__value">${summary.total_cost.toFixed(2)}</div>
      </div>
      <div className="sl-card">
        <div className="sl-card__title">총 평가액</div>
        <div className="sl-card__value">${summary.total_market.toFixed(2)}</div>
      </div>
      <div className="sl-card">
        <div className="sl-card__title">손익</div>
        <div className={`sl-card__value ${pnlClass}`}>
          {summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(2)}
        </div>
      </div>
      <div className="sl-card">
        <div className="sl-card__title">수익률</div>
        <div className={`sl-card__value ${pnlClass}`}>
          {summary.total_pnl_rate >= 0 ? '+' : ''}{summary.total_pnl_rate.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
