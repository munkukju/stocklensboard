import { getSession } from '@/lib/session';

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
  return Response.json({ ok: true, data: user });
}
