// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { uploadMedia, signedUrl } from '@/lib/storage';

// À recopier depuis l'app du bracelet (capture jointe en sauvegarde).
const FIELDS = [
  { key: 'sleep_hours', label: 'Sleep', unit: 'h' },
  { key: 'sleep_quality', label: 'Sleep quality', unit: '1-5' },
  { key: 'resting_hr', label: 'Resting HR', unit: 'bpm' },
  { key: 'hrv', label: 'HRV', unit: 'ms' },
  { key: 'stress_level', label: 'Stress', unit: '1-5' },
  { key: 'steps', label: 'Steps', unit: '' },
];
const INT_FIELDS = ['sleep_quality', 'resting_hr', 'hrv', 'stress_level', 'steps'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function BiometricsPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(today());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from('biometrics').select('*').order('log_date', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  const setVal = (k: string, v: string) => setVals((m) => ({ ...m, [k]: v }));

  async function add() {
    setBusy(true); setErr(null);
    let screenshot_path = null;
    if (file) { screenshot_path = await uploadMedia(userId, 'biometrics', file); }
    const payload: any = { user_id: userId, log_date: date, screenshot_path, notes: notes.trim() || null };
    FIELDS.forEach((f) => {
      const raw = vals[f.key];
      if (raw === undefined || raw === '') { payload[f.key] = null; return; }
      payload[f.key] = INT_FIELDS.includes(f.key) ? Math.round(Number(raw)) : Number(raw);
    });
    const { error } = await supabase.from('biometrics').insert(payload);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setVals({}); setNotes(''); setFile(null); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('biometrics').delete().eq('id', id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  }
  async function viewShot(path: string) { const u = await signedUrl(path, 600); if (u) window.open(u, '_blank'); }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Biometrics</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 640 }}>Sleep, stress and heart data from your wearable. Poor sleep and high stress are well-known shedding triggers — log them so the analysis can connect the dots.</div>

      <div className="card" style={{ padding: 18, marginTop: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 150px' }} />
          <label style={{ fontSize: 13, color: '#6b6573', display: 'flex', alignItems: 'center', gap: 8 }}>
            Wearable screenshot:
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5 }} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <div style={{ fontSize: 11.5, color: '#8a8390', marginBottom: 3 }}>{f.label}{f.unit ? <span style={{ color: '#c3bdca' }}> ({f.unit})</span> : null}</div>
              <input value={vals[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} inputMode="decimal" placeholder="—" style={{ ...inp, width: '100%', padding: '8px 10px' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, flex: '3 1 240px' }} />
          <button onClick={add} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save day'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 26 }}>History</div>
      {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
      : rows.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No days logged yet.</div>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {rows.map((r, i) => (
            <motion.div key={r.id} className="card" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.015 }} style={{ padding: '11px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 650, color: '#1a1625' }}>{fmtDay(r.log_date)}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.screenshot_path && <button onClick={() => viewShot(r.screenshot_path)} style={miniBtn}>Screenshot</button>}
                  <button onClick={() => remove(r.id)} style={{ ...miniBtn, color: '#c3779a', borderColor: '#f6d6db' }}>×</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 7 }}>
                {FIELDS.filter((f) => r[f.key] != null).map((f) => (
                  <span key={f.key} style={{ fontSize: 12.5, color: '#6b6573' }}><b style={{ color: '#1a1625' }}>{r[f.key]}</b>{f.unit ? ` ${f.unit}` : ''} {f.label}</span>
                ))}
                {FIELDS.every((f) => r[f.key] == null) && <span style={{ fontSize: 12.5, color: '#c3bdca' }}>screenshot only</span>}
              </div>
              {r.notes && <div style={{ fontSize: 12, color: '#8a8390', marginTop: 5 }}>{r.notes}</div>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '5px 11px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 12.5, cursor: 'pointer', color: '#6b6573' };
