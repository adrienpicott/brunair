// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
const today = () => new Date().toISOString().slice(0, 10);
export default function TodayAdherence({ routines, userId }: { routines: any[]; userId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  async function load() {
    if (!userId) return;
    const { data } = await supabase.from('routine_logs').select('*').eq('log_date', today());
    setLogs(data || []);
  }
  useEffect(() => { load(); }, [userId]);
  const doneFor = (rid: string) => logs.find((l) => l.routine_id === rid && l.completed);
  async function toggle(r: any) {
    const existing = doneFor(r.id);
    if (existing) {
      await supabase.from('routine_logs').delete().eq('id', existing.id);
      setLogs((a) => a.filter((x) => x.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('routine_logs').insert({ user_id: userId, routine_id: r.id, log_date: today(), completed: true }).select();
      if (!error && data) setLogs((a) => [...a, data[0]]);
    }
  }
  if (!routines || routines.length === 0) return null;
  const doneCount = routines.filter((r) => doneFor(r.id)).length;
  return (
    <div className="card" style={{ padding: 16, marginTop: 20, background: '#fbfaff', borderColor: '#e7e0ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1625' }}>Today — adherence</div>
        <div style={{ fontSize: 12.5, color: '#7c5cff', fontWeight: 600 }}>{doneCount}/{routines.length} done</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {routines.map((r) => {
          const done = !!doneFor(r.id);
          return (
            <button key={r.id} onClick={() => toggle(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 22, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: done ? '1px solid #3fb39a' : '1px solid #ece6e1', background: done ? '#e6f5f1' : '#fff', color: done ? '#2f8a76' : '#6b6573' }}>
              <span style={{ width: 16, height: 16, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', background: done ? '#3fb39a' : '#d8d2dd' }}>{done ? '✓' : ''}</span>
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
