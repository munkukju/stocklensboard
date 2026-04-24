'use client';
import { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // QueryClient 는 한 번만 생성 (useState lazy init)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 401 (토큰 만료) 이면 로그인 페이지로, 그 외엔 ErrorBoundary 로
        throwOnError: (error) => {
          if (error.message === 'UNAUTHORIZED') {
            window.location.href = '/login';
            return false;    // ErrorBoundary 로 안 보냄
          }
          return true;       // ErrorBoundary 로 보냄
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        throwOnError: false,         // mutation 은 onError 에서 처리
      },
    },
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
