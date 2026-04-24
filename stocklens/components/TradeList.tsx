'use client';
import { useState, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TradeFormModal from './TradeFormModal';
import type { Trade, Stock, ApiResponse } from '@/lib/types';

export default function TradeList() {
  // 종목 필터: 빈 문자열 = 전체
  const [ticker, setTicker] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);

  const qc = useQueryClient();

  // 매매일지 조회 — 필터 변경 시 자동 재조회
  const tradesQuery = useQuery<Trade[]>({
    queryKey: ['trades', ticker],
    queryFn: async () => {
      const url = ticker ? `/api/trades?ticker=${ticker}` : '/api/trades';
      const res = await fetch(url);
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const json: ApiResponse<Trade[]> = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
  });

  // 셀렉트박스용 종목 목록
  const stocksQuery = useQuery<Stock[]>({
    queryKey: ['stocks'],
    queryFn: async () => {
      const res = await fetch('/api/stocks');
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const json: ApiResponse<Stock[]> = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
  });

  // 매매 삭제 — 성공 시 trades + portfolio invalidate
  const deleteTrade = useMutation<ApiResponse<{ id: number }>, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: (json) => {
      if (!json.ok) { alert(json.error); return; }
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
    onError: () => alert('삭제 실패'),
  });

  const handleDelete = (id: number) => {
    if (!confirm('이 매매 기록을 삭제하시겠습니까?')) return;
    deleteTrade.mutate(id);
  };

  const trades = tradesQuery.data ?? [];
  const stocks = stocksQuery.data ?? [];

  return (
    <div className="sl-trade">
      <div className="sl-trade__toolbar">
        <select
          className="sl-input"
          value={ticker}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setTicker(e.target.value)}
        >
          <option value="">전체</option>
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker}>{s.ticker}</option>
          ))}
        </select>
        <button className="sl-btn" onClick={() => setOpen(true)}>+ 매매 추가</button>
      </div>

      {tradesQuery.isLoading && <p>불러오는 중...</p>}

      {!tradesQuery.isLoading && trades.length === 0 && (
        <p>매매 내역이 없습니다.</p>
      )}

      <table className="sl-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>종목</th>
            <th>구분</th>
            <th>수량</th>
            <th>가격</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            // BUY 파랑 / SELL 빨강
            const typeClass = t.type === 'BUY' ? 'sl-trade__buy' : 'sl-trade__sell';
            return (
              <tr key={t.id}>
                <td>{t.trade_date}</td>
                <td>{t.ticker} <small>{t.ticker_name}</small></td>
                <td className={typeClass}>{t.type}</td>
                <td>{Number(t.quantity)}</td>
                <td>${Number(t.price).toFixed(2)}</td>
                <td>{t.note ?? ''}</td>
                <td>
                  <button
                    className="sl-btn sl-btn--ghost sl-btn--sm"
                    onClick={() => handleDelete(t.id)}
                    disabled={deleteTrade.isPending}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {open && (
        <TradeFormModal
          stocks={stocks}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
