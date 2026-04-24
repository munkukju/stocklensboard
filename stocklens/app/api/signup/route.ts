import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { signJwt } from '@/lib/auth';
import { pool } from '@/lib/db';
import type { User } from '@/lib/types';

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  // 이메일 중복 체크
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if ((existing as User[]).length > 0) {
    return Response.json({ ok: false, error: '이미 가입된 이메일입니다' }, { status: 400 });
  }

  // 비밀번호 해시
  const hash = await bcrypt.hash(password, 10);

  // 유저 생성
  const [result] = await pool.query(
    'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
    [email, hash, name]
  );
  const insertId = (result as { insertId: number }).insertId;

  // JWT 발급 + 쿠키 세팅
  const token = signJwt({ uid: insertId });
  cookies().set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,   // 7일
  });

  return Response.json({ ok: true, data: { id: insertId, email, name } });
}
