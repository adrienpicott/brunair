// @ts-nocheck
'use client';
export default function TrendChart({ points = [], color = '#7c5cff', height = 60, area = true }: any) {
  if (!points || points.length < 2) return <div style={{ fontSize: 12.5, color: '#a59fae', padding: '8px 0' }}>Not enough data yet — keep logging.</div>;
  const W = 320, H = height, pad = 8;
  const vals = points.map((p: any) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1, n = points.length;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);
  const line = points.map((p: any, i: number) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const areaPath = `M ${x(0).toFixed(1)},${(H - pad).toFixed(1)} L ` + points.map((p: any, i: number) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' L ') + ` L ${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  const gid = 'tg' + Math.random().toString(36).slice(2, 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.20" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {area && <path d={areaPath} fill={`url(#${gid})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r="3.4" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
