import { getSession } from '@/lib/session';
import { pool } from '@/lib/db';
import type { Allocation, PortfolioSummary } from '@/lib/types';

// DB 에서 나오는 원본 row (숫자는 문자열로 오기 쉬움 → 변환 필요)
interface RawRow {
  ticker: string;
  ticker_name: string;
  current_price: number;
  quantity: number;
  avg_cost: number;
}

// 포트폴리오 집계 — tick 쿼리로 현재가 시점 결정
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tickParam = searchParams.get('tick');
  if (tickParam === null) {
    return Response.json({ ok: false, error: 'tick 파라미터가 필요합니다' }, { status: 400 });
  }
  const tick = Number(tickParam);

  // §7.2 집계 SQL (tick 주입 + user_id 필터)
  const [result] = await pool.query(
    `SELECT
       s.ticker, s.name AS ticker_name, pt.price AS current_price,
       SUM(CASE WHEN t.type='BUY'  THEN t.quantity ELSE 0 END) -
       SUM(CASE WHEN t.type='SELL' THEN t.quantity ELSE 0 END) AS quantity,
       SUM(CASE WHEN t.type='BUY' THEN t.quantity * t.price ELSE 0 END) /
         NULLIF(SUM(CASE WHEN t.type='BUY' THEN t.quantity ELSE 0 END), 0) AS avg_cost
     FROM trades t
     JOIN stock_prices s ON s.ticker = t.ticker
     JOIN price_ticks pt ON pt.ticker = t.ticker AND pt.tick_no = ?
     WHERE t.user_id = ?
     GROUP BY s.ticker, s.name, pt.price
     HAVING quantity > 0`,
    [tick, user.id]
  );

  // §7.3 비중·수익률 (서버 JS)
  const rows: RawRow[] = (result as RawRow[]).map((r) => ({
    ticker: r.ticker,
    ticker_name: r.ticker_name,
    current_price: Number(r.current_price),
    quantity: Number(r.quantity),
    avg_cost: Number(r.avg_cost),
  }));

  const withValues = rows.map((r) => ({
    ...r,
    cost_value: r.quantity * r.avg_cost,
    market_value: r.quantity * r.current_price,
  }));

  const totalCost = withValues.reduce((s, r) => s + r.cost_value, 0);
  const totalMarket = withValues.reduce((s, r) => s + r.market_value, 0);

  const allocation: Allocation[] = withValues.map((r) => ({
    ...r,
    pnl: r.market_value - r.cost_value,
    pnl_rate: r.cost_value ? ((r.market_value - r.cost_value) / r.cost_value) * 100 : 0,
    cost_weight:   totalCost   ? (r.cost_value   / totalCost)   * 100 : 0,
    market_weight: totalMarket ? (r.market_value / totalMarket) * 100 : 0,
  }));

  const summary: PortfolioSummary = {
    total_cost: totalCost,
    total_market: totalMarket,
    total_pnl: totalMarket - totalCost,
    total_pnl_rate: totalCost ? ((totalMarket - totalCost) / totalCost) * 100 : 0,
    tick_no: tick,
  };

  return Response.json({ ok: true, data: { summary, allocation } });
}
