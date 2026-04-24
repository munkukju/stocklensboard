import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import SignupForm from '@/components/SignupForm';

// 매 요청마다 세션 검사 — 정적 캐시되면 가드가 무용지물이 됨
export const dynamic = 'force-dynamic';

// 회원가입 페이지 (Server Component) — LoginPage 와 동일 구조
export default async function SignupPage() {
  // 이미 로그인된 사용자가 /signup 으로 오면 대시보드로 보냄
  const user = await getSession();
  if (user) redirect('/dashboard');

  return (
    <div className="sl-auth">
      <h1>회원가입</h1>
      <SignupForm />
      <p className="sl-auth__footer">
        이미 계정이 있으신가요? <a href="/login">로그인</a>
      </p>
    </div>
  );
}
