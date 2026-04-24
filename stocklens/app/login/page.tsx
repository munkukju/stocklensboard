import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LoginForm from '@/components/LoginForm';

// 매 요청마다 세션 검사 — 정적 캐시되면 가드가 무용지물이 됨
export const dynamic = 'force-dynamic';

// 로그인 페이지 (Server Component)
export default async function LoginPage() {
  // 이미 로그인된 사용자가 /login 으로 오면 대시보드로 보냄
  const user = await getSession();
  if (user) redirect('/dashboard');

  return (
    <div className="sl-auth">
      <h1>로그인</h1>
      <LoginForm />
      <p className="sl-auth__footer">
        계정이 없으신가요? <a href="/signup">회원가입</a>
      </p>
    </div>
  );
}
