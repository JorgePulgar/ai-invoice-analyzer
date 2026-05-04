import { useState, useEffect } from 'react';

export interface ChartColors {
  legend:         string;
  tick:           string;
  grid:           string;
  border:         string;
  doughnutBorder: string;
}

function current(): ChartColors {
  const dark = document.documentElement.classList.contains('dark');
  return dark
    ? { legend: '#EAECEF', tick: '#707A8A', grid: '#2B3139', border: '#2B3139', doughnutBorder: '#1E2329' }
    : { legend: '#1E293B', tick: '#475569', grid: '#E2E8F0', border: '#E2E8F0', doughnutBorder: '#FFFFFF' };
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(current);

  useEffect(() => {
    const handler = () => setColors(current());
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

  return colors;
}
