// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const CATS = [
  { key: 'illness', label: 'Illness', color: '#e8788a' },
  { key: 'fever', label: 'Fever', color: '#d4564f' },
  { key: 'diet', label: 'Diet change', color: '#d59a3f' },
  { key: 'stress', label: 'Stress', color: '#a05cff' },
  { key: 'medication_change', label: 'Medication change', color: '#5c8cff' },
  { key: 'travel', label: 'Travel', color: '#3fb39a' },
  { key: 'other', label: 'Other', color: '#9a8fae' },
];
const CAT_MAP = Object.fromEntries(CATS.map((c) => [c.key, c]));
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function EventsPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('stress');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('3');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('log_date', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (!description.trim()) { setErr('Add a short description.'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('events').insert({ user_id: userId, log_date: date, category, description: description.trim(), severity: Number(severity) });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDescription(''); setSeverity('3'); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Events</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 640 }}>Illness, fever, a drastic diet, a big stress, a change of pill… Telogen shedding often shows up <b>2–3 months after</b> the trigger, so this timeline is what lets the analysis explain a sudden drop.</div>

      <div className="card" style={{ padding: 18, marginTop: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 140px' }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inp, flex: '1 1 160px' }}>
            {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ ...inp, flex: '1 1 120px' }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>severity {n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" style={{ ...inp, flex: '3 1 240px' }} />
          <button onClick={add} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Log event'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 26 }}>Timeline</div>
      {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
      : rows.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No events logged yet.</div>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {rows.map((e, i) => {
            const c = CAT_MAP[e.category] || { label: e.category, color: '#9a8fae' };
            return (
              <motion.div key={e.id} className="card" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }}
                style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: c.color, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{c.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: '#1a1625', fontWeight: 600 }}>{e.description}</div>
                  <div style={{ fontSize: 12, color: '#8a8390', marginTop: 2 }}>{fmtDay(e.log_date)}{e.severity ? ` · severity ${e.severity}/5` : ''}</div>
                </div>
                <button onClick={() => remove(e.id)} style={{ ...miniBtn, color: '#c3779a', borderColor: '#f6d6db' }}>×</button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '5px 11px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 13, cursor: 'pointer', color: '#6b6573' };
