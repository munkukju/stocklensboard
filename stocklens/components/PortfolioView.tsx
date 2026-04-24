'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import AllocationDonut from './AllocationDonut';
import SummaryCards from './SummaryCards';
import HoldingsTable from './HoldingsTable';
import type { Allocation, PortfolioSummary, ApiResponse } from '@/lib/types';

const TOTAL_TICKS = 180;

// 재생 속도 옵션 (ms 단위 — 작을수록 빠름)
const SPEED_OPTIONS = [
  { label: '1x (1초)',   ms: 1000 },
  { label: '2x (0.5초)', ms: 500 },
  { label: '5x (0.2초)', ms: 200 },
];

// tick 번호 → "mm:ss" 포맷 (45 → "00:45")
function formatTick(tick: number): string {
  const mm = String(Math.floor(tick / 60)).padStart(2, '0');
  const ss = String(tick % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// API 응답 전체 타입
interface PortfolioData {
  summary: PortfolioSummary;
  allocation: Allocation[];
}

export default function PortfolioView() {
  // 시뮬레이터 상태: 현재 틱 번호 (클라이언트가 주도)
  const [tick, setTick] = useState<number>(0);
  // 자동 재생 여부
  const [playing, setPlaying] = useState<boolean>(false);
  // 재생 속도 (ms)
  const [speedMs, setSpeedMs] = useState<number>(SPEED_OPTIONS[0].ms);
  // 직전 응답 보관 — tick 바뀔 때 화면이 깜빡이지 않게 직전 값을 유지
  const [lastData, setLastData] = useState<PortfolioData | null>(null);

  // 자동 재생: playing 이 true 일 때만 setInterval 로 tick 증가
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTick((t) => {
        const next = t + 1;
        // 마지막 틱 도달 시 자동 정지
        if (next >= TOTAL_TICKS) {
          setPlaying(false);
          return TOTAL_TICKS - 1;
        }
        return next;
      });
    }, speedMs);
    return () => clearInterval(timer);
  }, [playing, speedMs]);

  // 단일 API 호출 → 객체 분해로 summary + allocation 동시 획득
  const { data } = useQuery<PortfolioData>({
    queryKey: ['portfolio', tick],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio?tick=${tick}`);
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const json: ApiResponse<PortfolioData> = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
  });

  // 새 응답 도착 시에만 직전 값 갱신 — fetch 중에도 화면이 사라지지 않음
  useEffect(() => {
    if (data) setLastData(data);
  }, [data]);

  const handlePlayToggle = () => setPlaying((p) => !p);
  const handleNext = () => setTick((t) => (t + 1) % TOTAL_TICKS);
  const handleReset = () => {
    setPlaying(false);
    setTick(0);
  };
  const handleSpeed = (e: ChangeEvent<HTMLSelectElement>) => {
    setSpeedMs(Number(e.target.value));
  };

  // 첫 로드 때만 placeholder 노출, 이후엔 lastData 가 항상 채워져 있음
  if (!lastData) return <p>불러오는 중...</p>;
  const { summary, allocation } = lastData;

  return (
    <div className="sl-portfolio">
      {/* 1. 시뮬레이터 컨트롤 */}
      <div className="sl-simulator">
        <div className="sl-simulator__header">
          <span className="sl-simulator__badge">🎬 시세 시뮬레이션</span>
          <span className="sl-simulator__time">{formatTick(tick)} / 03:00</span>
        </div>
        <div className="sl-simulator__progress">
          <div
            className="sl-simulator__bar"
            style={{ width: `${(tick / (TOTAL_TICKS - 1)) * 100}%` }}
          />
        </div>
        <div className="sl-simulator__controls">
          <button className="sl-btn" onClick={handlePlayToggle}>
            {playing ? '⏸ 일시정지' : '▶ 재생'}
          </button>
          <button className="sl-btn" onClick={handleNext} disabled={playing}>🔄 다음 틱</button>
          <button className="sl-btn" onClick={handleReset}>⏮ 리셋</button>
          <select className="sl-input sl-simulator__speed" value={speedMs} onChange={handleSpeed}>
            {SPEED_OPTIONS.map((o) => (
              <option key={o.ms} value={o.ms}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. 요약 카드 4개 */}
      <SummaryCards summary={summary} />

      {/* 3. 도넛 2개 */}
      <div className="sl-donuts">
        <div className="sl-donut"><h3>매입가 비중</h3><AllocationDonut allocation={allocation} kind="cost" /></div>
        <div className="sl-donut"><h3>평가액 비중</h3><AllocationDonut allocation={allocation} kind="market" /></div>
      </div>

      {/* 4. 보유 테이블 */}
      <HoldingsTable allocation={allocation} />
    </div>
  );
}
