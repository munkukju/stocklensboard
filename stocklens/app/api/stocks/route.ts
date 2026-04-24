import { getSession } from '@/lib/session';
import { pool } from '@/lib/db';

// 종목 마스터 전체 반환 (셀렉트박스용)
export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const [rows] = await pool.query('SELECT ticker, name, currency FROM stock_prices ORDER BY ticker');
  return Response.json({ ok: true, data: rows });
}
