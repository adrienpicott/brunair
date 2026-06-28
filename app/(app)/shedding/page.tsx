// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const METHODS = [
  { key: '60s_count', label: '60-second count' },
  { key: 'shower', label: 'After shower' },
  { key: 'brush', label: 'After brushing' },
  { key: 'pillow', label: 'Pillow / morning' },
];
const METHOD_MAP = Object.fromEntries(METHODS.map((m) => [m.key, m.label]));
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function SheddingPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(today());
  const [method, setMethod] = useState('60s_count');
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('shedding_counts').select('*').order('log_date', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (count === '') { setErr('Enter a count.'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('shedding_counts').insert({ user_id: userId, log_date: date, method, count: Math.round(Number(count)), notes: notes.trim() || null });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCount(''); setNotes(''); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('shedding_counts').delete().eq('id', id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  }

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const last7 = rows.slice(0, 7).map((r) => r.count).filter((n) => n != null);
    const avg = last7.length ? Math.round(last7.reduce((a, b) => a + b, 0) / last7.length) : null;
    return { latest: rows[0].count, avg, n: last7.length };
  }, [rows]);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Shedding count</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 640 }}>A simple number you can trust, independent of photos. Pick one method and stick to it for consistency. Around 50–100 lost hairs a day is considered normal — what matters is your own trend.</div>

      {stats && (
        <div className="card" style={{ padding: 16, marginTop: 18, display: 'flex', gap: 28, flexWrap: 'wrap', background: '#fbfaff', borderColor: '#e7e0ff' }}>
          <div><div style={{ fontSize: 11.5, color: '#a59fae', fontWeight: 600, textTransform: 'uppercase' }}>Latest</div><div style={{ fontSize: 20, fontWeight: 700, color: '#1a1625', marginTop: 2 }}>{stats.latest}</div></div>
          {stats.avg != null && <div><div style={{ fontSize: 11.5, color: '#a59fae', fontWeight: 600, textTransform: 'uppercase' }}>Avg (last {stats.n})</div><div style={{ fontSize: 20, fontWeight: 700, color: '#7c5cff', marginTop: 2 }}>{stats.avg}</div></div>}
        </div>
      )}

      <div className="card" style={{ padding: 18, marginTop: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 140px' }} />
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ ...inp, flex: '1 1 160px' }}>
            {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" placeholder="count" style={{ ...inp, flex: '1 1 100px' }} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, flex: '2 1 160px' }} />
          <button onClick={add} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Log'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 26 }}>History</div>
      {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
      : rows.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No counts logged yet.</div>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {rows.map((r, i) => (
            <motion.div key={r.id} className="card" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }}
              style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1625', minWidth: 44 }}>{r.count}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: '#1a1625', fontWeight: 600 }}>{METHOD_MAP[r.method] || r.method}</div>
                <div style={{ fontSize: 12, color: '#8a8390', marginTop: 2 }}>{fmtDay(r.log_date)}{r.notes ? ` · ${r.notes}` : ''}</div>
              </div>
              <button onClick={() => remove(r.id)} style={{ ...miniBtn, color: '#c3779a', borderColor: '#f6d6db' }}>×</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '5px 11px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 13, cursor: 'pointer', color: '#6b6573' };
