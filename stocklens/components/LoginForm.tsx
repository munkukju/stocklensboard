'use client';
import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse, User } from '@/lib/types';

export default function LoginForm() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);   // Zustand

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json: ApiResponse<User> = await res.json();
      if (!json.ok) { alert(json.error); return; }
      setUser(json.data);              // 로그인 성공 → 세션 저장
      router.push('/dashboard');
    } catch (err) { console.error(err); alert('로그인 실패'); }
  };

  return (
    <form onSubmit={handleSubmit} className="sl-form">
      <input className="sl-input"
             value={email}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
             placeholder="이메일" />
      <input className="sl-input" type="password"
             value={password}
             onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
             placeholder="비밀번호" />
      <button className="sl-btn" type="submit">로그인</button>
    </form>
  );
}
