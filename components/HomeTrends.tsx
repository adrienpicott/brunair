// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TrendChart from './TrendChart';
import Heatmap from './Heatmap';

const dkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayAgo = (n: number) => dkey(new Date(Date.now() - n * 86400000));

export default function HomeTrends({ userId }: { userId: string }) {
  const [shed, setShed] = useState<any[]>([]);
  const [adh, setAdh] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const [sh, rl] = await Promise.all([
        supabase.from('shedding_counts').select('log_date,count').gte('log_date', dayAgo(60)).order('log_date', { ascending: true }),
        supabase.from('routine_logs').select('log_date,completed').gte('log_date', dayAgo(28)),
      ]);
      setShed((sh.data || []).filter((r) => r.count != null).map((r) => ({ value: r.count })));
      setAdh(new Set((rl.data || []).filter((l) => l.completed).map((l) => l.log_date)));
      setReady(true);
    })();
  }, [userId]);

  if (!ready) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#a59fae', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Shedding trend (60 days)</div>
        <TrendChart points={shed} color="#d59a3f" />
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#a59fae', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Routine adherence (28 days)</div>
        <Heatmap activeDays={adh} count={28} color="#3fb39a" />
        <div style={{ fontSize: 11.5, color: '#a59fae', marginTop: 8 }}>Each square is a day — green when you did a routine.</div>
      </div>
    </div>
  );
}
