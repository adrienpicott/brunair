// @ts-nocheck
'use client';
const dkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export default function Heatmap({ activeDays, count = 28, color = '#3fb39a' }: any) {
  const set = activeDays || new Set();
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dkey(d)); }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {days.map((k) => { const on = set.has(k); return (
        <span key={k} title={k} style={{ width: 14, height: 14, borderRadius: 4, background: on ? color : '#efeae5' }} />
      ); })}
    </div>
  );
}
