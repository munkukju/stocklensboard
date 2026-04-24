'use client';
import { useState, FormEvent, ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Stock, Trade, ApiResponse } from '@/lib/types';

// 폼에서 서버로 보낼 때 쓰는 타입 (id 등은 서버가 생성)
interface TradeInput {
  ticker: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  trade_date: string;
  note: string | null;
}

interface RollbackContext {
  previous: Trade[] | undefined;
}

interface TradeFormModalProps {
  stocks: Stock[];
  onClose: () => void;
}

// 임시 id 생성: 음수 → 서버의 auto_increment(양수)와 절대 충돌 안 남
// onSettled에서 invalidate 되면 실제 id 로 교체됨
function makeOptimisticTrade(input: TradeInput): Trade {
  return {
    id: -Date.now(),               // 임시 음수 id
    user_id: 0,                    // 서버에서 채워줌
    ticker: input.ticker,
    ticker_name: input.ticker,     // 임시로 ticker 재사용 (JOIN 결과는 invalidate 후 도착)
    type: input.type,
    quantity: input.quantity,
    price: input.price,
    trade_date: input.trade_date,
    note: input.note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// 오늘 날짜 'YYYY-MM-DD' 포맷
function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function TradeFormModal({ stocks, onClose }: TradeFormModalProps) {
  // 폼 상태 — 모든 필드
  const [ticker, setTicker] = useState<string>(stocks[0]?.ticker ?? '');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [tradeDate, setTradeDate] = useState<string>(todayISO());
  const [note, setNote] = useState<string>('');

  const qc = useQueryClient();

  // useMutation 은 반드시 함수 컴포넌트 안에서 호출 (규칙 #2)
  const addTrade = useMutation<ApiResponse<{ id: number }>, Error, TradeInput, RollbackContext>({
    mutationFn: async (newTrade) => {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrade),
      });
      return res.json();
    },
    onMutate: async (newTrade) => {
      await qc.cancelQueries({ queryKey: ['trades'] });
      const previous = qc.getQueryData<Trade[]>(['trades']);
      const optimistic = makeOptimisticTrade(newTrade);
      qc.setQueryData<Trade[]>(['trades'], (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _newTrade, context) => {
      if (context?.previous) qc.setQueryData(['trades'], context.previous);
      alert('추가 실패');
    },
    onSettled: () => {
      // 서버 데이터로 교체 (임시 id 자동 대체)
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input: TradeInput = {
      ticker,
      type,
      quantity: Number(quantity),
      price: Number(price),
      trade_date: tradeDate,
      note: note.trim() === '' ? null : note,
    };
    addTrade.mutate(input);
    onClose();
  };

  return (
    <div className="sl-modal" onClick={onClose}>
      <div className="sl-modal__panel" onClick={(e) => e.stopPropagation()}>
        <h2>매매 추가</h2>
        <form onSubmit={handleSubmit} className="sl-form">
          <label>
            종목
            <select className="sl-input" value={ticker}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setTicker(e.target.value)}>
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
              ))}
            </select>
          </label>

          <label>
            구분
            <select className="sl-input" value={type}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as 'BUY' | 'SELL')}>
              <option value="BUY">매수 (BUY)</option>
              <option value="SELL">매도 (SELL)</option>
            </select>
          </label>

          <label>
            수량
            <input className="sl-input" type="number" step="0.0001" min="0"
                   value={quantity}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)} />
          </label>

          <label>
            가격 ($)
            <input className="sl-input" type="number" step="0.01" min="0"
                   value={price}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)} />
          </label>

          <label>
            거래일
            <input className="sl-input" type="date"
                   value={tradeDate}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => setTradeDate(e.target.value)} />
          </label>

          <label>
            메모
            <input className="sl-input"
                   value={note}
                   onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                   placeholder="(선택)" />
          </label>

          <div className="sl-modal__actions">
            <button type="button" className="sl-btn sl-btn--ghost" onClick={onClose}>취소</button>
            <button type="submit" className="sl-btn">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
