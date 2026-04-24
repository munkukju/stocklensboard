import { getSession } from '@/lib/session';
import { pool } from '@/lib/db';

interface TradeOwnerRow {
  user_id: number;
}

// 매매 수정 (본인 데이터만)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const id = Number(params.id);
  const { ticker, type, quantity, price, trade_date, note } = await req.json();

  // 음수 금지
  if (Number(quantity) <= 0 || Number(price) <= 0) {
    return Response.json({ ok: false, error: '수량과 가격은 0보다 커야 합니다' }, { status: 400 });
  }

  // 소유권 검증
  const [ownerRows] = await pool.query('SELECT user_id FROM trades WHERE id = ?', [id]);
  const owner = (ownerRows as TradeOwnerRow[])[0];
  if (!owner || owner.user_id !== user.id) {
    return Response.json({ ok: false, error: '권한이 없습니다' }, { status: 403 });
  }

  await pool.query(
    `UPDATE trades
     SET ticker = ?, type = ?, quantity = ?, price = ?, trade_date = ?, note = ?
     WHERE id = ?`,
    [ticker, type, quantity, price, trade_date, note ?? null, id]
  );

  return Response.json({ ok: true, data: { id } });
}

// 매매 삭제 (본인 데이터만)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인 필요' }, { status: 401 });

  const id = Number(params.id);

  // 소유권 검증
  const [ownerRows] = await pool.query('SELECT user_id FROM trades WHERE id = ?', [id]);
  const owner = (ownerRows as TradeOwnerRow[])[0];
  if (!owner || owner.user_id !== user.id) {
    return Response.json({ ok: false, error: '권한이 없습니다' }, { status: 403 });
  }

  await pool.query('DELETE FROM trades WHERE id = ?', [id]);
  return Response.json({ ok: true, data: { id } });
}
