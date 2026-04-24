import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호 페이지 1차 차단 — 쿠키 없으면 /login 으로
export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
