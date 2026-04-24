// 사용자
export interface User {
  id: number;
  email: string;
  name: string;
}

// 종목
export interface Stock {
  ticker: string;
  name: string;
  currency: string;
}

// 매매일지
export interface Trade {
  id: number;
  user_id: number;
  ticker: string;
  ticker_name: string;        // 항상 JOIN 해서 채워 보냄
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  trade_date: string;         // 'YYYY-MM-DD'
  note: string | null;
  created_at: string;
  updated_at: string;
}

// 포트폴리오 종목별 집계
export interface Allocation {
  ticker: string;
  ticker_name: string;        // Trade.ticker_name 과 일관
  quantity: number;
  avg_cost: number;
  current_price: number;
  cost_value: number;
  market_value: number;
  pnl: number;
  pnl_rate: number;
  cost_weight: number;
  market_weight: number;
}

// 포트폴리오 요약
export interface PortfolioSummary {
  total_cost: number;
  total_market: number;
  total_pnl: number;
  total_pnl_rate: number;
  tick_no: number;
}

// JWT payload
export interface JwtPayload {
  uid: number;
}

// API 응답 공통
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
