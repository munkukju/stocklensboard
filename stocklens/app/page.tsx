import { redirect } from 'next/navigation';

// 루트 진입점: 대시보드로 리다이렉트 — 로그인 안 된 상태면 middleware 가 /login 으로 보냄
export default function HomePage() {
  redirect('/dashboard');
}
