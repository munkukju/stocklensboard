import { cookies } from 'next/headers';
import { verifyJwt } from './auth';
import { pool } from './db';
import type { User } from './types';

// 현재 로그인 유저 반환 (없으면 null)
export async function getSession(): Promise<User | null> {
  const token = cookies().get('token')?.value;
  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload) return null;

  const [rows] = await pool.query(
    'SELECT id, email, name FROM users WHERE id = ?',
    [payload.uid]
  );
  const users = rows as User[];
  return users[0] || null;
}
