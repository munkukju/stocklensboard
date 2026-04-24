'use client';
import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, User } from '@/lib/types';

// LoginForm 과 동일 구조, name 필드 추가
export default function SignupForm() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const json: ApiResponse<User> = await res.json();
      if (!json.ok) { alert(json.error); return; }
      setUser(json.data);              // 회원가입 성공 → 세션 저장
      router.push('/dashboard');
    } catch (err) { console.error(err); alert('회원가입 실패'); }
  };

  return (
    <form onSubmit={handleSubmit} className="sl-form">
      <input className="sl-input"
             value={name}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
             placeholder="이름" />
      <input className="sl-input"
             value={email}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
             placeholder="이메일" />
      <input className="sl-input" type="password"
             value={password}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
             placeholder="비밀번호" />
      <button className="sl-btn" type="submit">회원가입</button>
    </form>
  );
}
