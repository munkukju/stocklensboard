import jwt from 'jsonwebtoken';
import type { JwtPayload } from './types';

const SECRET = process.env.JWT_SECRET!;

// JWT 생성
export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

// JWT 검증 (실패 시 null)
export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
