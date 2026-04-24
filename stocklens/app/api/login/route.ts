import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { signJwt } from '@/lib/auth';
import { pool } from '@/lib/db';

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = (rows as UserRow[])[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return Response.json({ ok: false, error: '이메일 또는 비밀번호가 잘못되었습니다' }, { status: 401 });
  }

  const token = signJwt({ uid: user.id });
  cookies().set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true, data: { id: user.id, email: user.email, name: user.name } });
}
