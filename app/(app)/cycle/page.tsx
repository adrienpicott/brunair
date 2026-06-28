// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import DataCalendar, { ViewToggle } from '@/components/DataCalendar';

const TYPES = [
  { key: 'period_start', label: 'Period start', color: '#e8788a' },
  { key: 'period_end', label: 'Period end', color: '#c98a96' },
  { key: 'spotting', label: 'Spotting', color: '#d59a3f' },
  { key: 'symptom', label: 'Symptom only', color: '#7c5cff' },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.key, t]));
const FLOWS = ['light', 'medium', 'heavy'];
const SYMPTOMS = ['cramps', 'headache', 'bloating', 'mood swings', 'acne', 'fatigue', 'breast tenderness', 'back pain', 'hair shedding', 'oily scalp'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 86400000);

export default function CyclePage() {
  const { userId } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(today());
  const [type, setType] = useState('period_start');
  const [flow, setFlow] = useState('medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [view, setView] = useState('list');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('cycle_events').select('*').order('log_date', { ascending: false });
    setEvents(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  const toggleSymptom = (s: string) => setSymptoms((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  const showFlow = type === 'period_start' || type === 'spotting';

  async function add() {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('cycle_events').insert({
      user_id: userId, log_date: date, type,
      flow: showFlow ? flow : null, symptoms: symptoms.length ? symptoms : null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSymptoms([]); setNotes(''); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('cycle_events').delete().eq('id', id);
    if (!error) setEvents((a) => a.filter((x) => x.id !== id));
  }

  // Résumé : dernières règles + cycle moyen
  const summary = useMemo(() => {
    const starts = events.filter((e) => e.type === 'period_start').map((e) => e.log_date).sort();
    if (starts.length === 0) return null;
    const last = starts[starts.length - 1];
    const sinceDays = daysBetween(last, today());
    let avg = null;
    if (starts.length >= 2) {
      const gaps = []; for (let i = 1; i < starts.length; i++) gaps.push(daysBetween(starts[i - 1], starts[i]));
      avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }
    return { last, sinceDays, avg };
  }, [events]);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Cycle</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 620 }}>Mark the start and end of your period, spotting, and any symptoms. Hormonal shifts are one of the biggest drivers of hair changes — this gives the analysis the timeline it needs.</div>

      {summary && (
        <div className="card" style={{ padding: 16, marginTop: 18, background: '#fffafb', borderColor: '#f6dde2', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div><div style={{ fontSize: 11.5, color: '#a59fae', fontWeight: 600, textTransform: 'uppercase' }}>Last period start</div><div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 3 }}>{fmtDay(summary.last)} · {summary.sinceDays}d ago</div></div>
          {summary.avg && <div><div style={{ fontSize: 11.5, color: '#a59fae', fontWeight: 600, textTransform: 'uppercase' }}>Avg cycle length</div><div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 3 }}>{summary.avg} days</div></div>}
        </div>
      )}

      <div className="card" style={{ padding: 18, marginTop: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 150px' }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inp, flex: '1 1 160px' }}>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {showFlow && (
            <select value={flow} onChange={(e) => setFlow(e.target.value)} style={{ ...inp, flex: '1 1 120px' }}>
              {FLOWS.map((f) => <option key={f} value={f}>{f} flow</option>)}
            </select>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: '#6b6573', marginTop: 14, marginBottom: 7 }}>Symptoms (optional)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SYMPTOMS.map((s) => {
            const on = symptoms.includes(s);
            return <button key={s} onClick={() => toggleSymptom(s)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', textTransform: 'capitalize',
              border: on ? '1px solid #7c5cff' : '1px solid #ece6e1', background: on ? '#f1ecff' : '#fff', color: on ? '#7c5cff' : '#6b6573', fontWeight: on ? 600 : 500 }}>{s}</button>;
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, flex: '3 1 240px' }} />
          <button onClick={add} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Logging…' : 'Log'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625' }}>History</div>
        <ViewToggle view={view} setView={setView} />
      </div>
      {view === 'calendar' ? (<DataCalendar rows={events} dateField="log_date" color="#e8788a" label="Cycle" renderDay={(rs) => rs.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#4a4453' }}>{(TYPE_MAP[e.type] || {}).label || e.type}{e.flow ? ` · ${e.flow}` : ''}{e.symptoms?.length ? ` — ${e.symptoms.join(', ')}` : ''}{e.notes ? ` — ${e.notes}` : ''}</div>)} />)
      : loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
      : events.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>Nothing logged yet.</div>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {events.map((e, i) => {
            const t = TYPE_MAP[e.type] || { label: e.type, color: '#9a8fae' };
            return (
              <motion.div key={e.id} className="card" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }}
                style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: t.color, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: '#1a1625', fontWeight: 600 }}>{fmtDay(e.log_date)}{e.flow ? <span style={{ fontWeight: 400, color: '#8a8390' }}> · {e.flow} flow</span> : null}</div>
                  {e.symptoms?.length ? <div style={{ fontSize: 12, color: '#8a8390', marginTop: 2 }}>{e.symptoms.join(' · ')}</div> : null}
                  {e.notes && <div style={{ fontSize: 12, color: '#8a8390', marginTop: 2 }}>{e.notes}</div>}
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
