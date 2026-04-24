'use client';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { Allocation } from '@/lib/types';

// Chart.js 모듈 등록 (한 번만)
ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE: string[] = ['#3B82F6', '#EF4444', '#10B981'];

interface AllocationDonutProps {
  allocation: Allocation[];
  kind: 'cost' | 'market';
}

export default function AllocationDonut({ allocation, kind }: AllocationDonutProps) {
  const data = {
    labels: allocation.map((a) => a.ticker),
    datasets: [{
      data: allocation.map((a) => kind === 'cost' ? a.cost_value : a.market_value),
      backgroundColor: allocation.map((_, i) => PALETTE[i % PALETTE.length]),
    }],
  };
  return <Doughnut data={data} />;
}
