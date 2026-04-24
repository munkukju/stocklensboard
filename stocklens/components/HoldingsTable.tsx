'use client';
import type { Allocation } from '@/lib/types';

interface HoldingsTableProps {
  allocation: Allocation[];
}

export default function HoldingsTable({ allocation }: HoldingsTableProps) {
  return (
    <table className="sl-table">
      <thead>
        <tr>
          <th>종목</th>
          <th>수량</th>
          <th>평균단가</th>
          <th>현재가</th>
          <th>평가액</th>
          <th>손익</th>
          <th>수익률</th>
        </tr>
      </thead>
      <tbody>
        {allocation.map((a) => {
          const pnlClass = a.pnl >= 0 ? 'sl-profit' : 'sl-loss';
          return (
            <tr key={a.ticker}>
              <td>{a.ticker} <small>{a.ticker_name}</small></td>
              <td>{a.quantity}</td>
              <td>${a.avg_cost.toFixed(2)}</td>
              <td>${a.current_price.toFixed(2)}</td>
              <td>${a.market_value.toFixed(2)}</td>
              <td className={pnlClass}>
                {a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(2)}
              </td>
              <td className={pnlClass}>
                {a.pnl_rate >= 0 ? '+' : ''}{a.pnl_rate.toFixed(2)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
