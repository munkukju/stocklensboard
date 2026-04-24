import { getSession } from '@/lib/session';
import { pool } from '@/lib/db';

// 매매일지 조회 (ticker 쿼리로 필터 — null 이면 전체)
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');

  // §7.1 SQL — 종목명을 ticker_name 으로 별칭
  const [rows] = await pool.query(
    `SELECT t.*, s.name AS ticker_name
     FROM trades t
     JOIN stock_prices s ON s.ticker = t.ticker
     WHERE t.user_id = ?
       AND (? IS NULL OR t.ticker = ?)
     ORDER BY t.trade_date DESC, t.id DESC`,
    [user.id, ticker, ticker]
  );
  return Response.json({ ok: true, data: rows });
}

// 매매 추가 — 검증 최소화 (음수 금지 정도만)
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const { ticker, type, quantity, price, trade_date, note } = await req.json();

  // 음수 금지 체크 (최소 검증)
  if (Number(quantity) <= 0 || Number(price) <= 0) {
    return Response.json({ ok: false, error: '수량과 가격은 0보다 커야 합니다' }, { status: 400 });
  }

  const [result] = await pool.query(
    `INSERT INTO trades (user_id, ticker, type, quantity, price, trade_date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, ticker, type, quantity, price, trade_date, note ?? null]
  );
  const insertId = (result as { insertId: number }).insertId;

  return Response.json({ ok: true, data: { id: insertId } });
}
