// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { uploadMedia, signedUrl } from '@/lib/storage';

// Panel "cheveux" — labels + unités SI par défaut (modifiables). Plages laissées vides : à recopier du labo.
const CATALOG = [
  { key: 'ferritin', label: 'Ferritin', unit: 'µg/L' },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L' },
  { key: 'ft4', label: 'Free T4 (FT4)', unit: 'pmol/L' },
  { key: 'vit_d', label: 'Vitamin D (25-OH)', unit: 'nmol/L' },
  { key: 'b12', label: 'Vitamin B12', unit: 'pmol/L' },
  { key: 'zinc', label: 'Zinc', unit: 'µmol/L' },
  { key: 'iron', label: 'Serum iron', unit: 'µmol/L' },
  { key: 'transferrin_sat', label: 'Transferrin saturation', unit: '%' },
  { key: 'testosterone', label: 'Testosterone (total)', unit: 'nmol/L' },
  { key: 'free_androgen_index', label: 'Free androgen index', unit: '' },
  { key: 'dheas', label: 'DHEA-S', unit: 'µmol/L' },
  { key: 'prolactin', label: 'Prolactin', unit: 'mIU/L' },
  { key: 'custom', label: 'Custom…', unit: '' },
];
const FLAG_COLOR: Record<string, string> = { low: '#d59a3f', high: '#e8788a', normal: '#3fb39a' };
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
function computeFlag(value: any, lo: any, hi: any) {
  if (value === '' || value == null) return null;
  const v = Number(value);
  if (lo !== '' && lo != null && v < Number(lo)) return 'low';
  if (hi !== '' && hi != null && v > Number(hi)) return 'high';
  if ((lo !== '' && lo != null) || (hi !== '' && hi != null)) return 'normal';
  return null;
}

export default function BloodPage() {
  const { userId } = useAuth();
  const [panels, setPanels] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pDate, setPDate] = useState(today());
  const [pLab, setPLab] = useState('');
  const [pNotes, setPNotes] = useState('');
  const [pFile, setPFile] = useState<File | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [mKey, setMKey] = useState('ferritin');
  const [mLabel, setMLabel] = useState('Ferritin');
  const [mUnit, setMUnit] = useState('µg/L');
  const [mValue, setMValue] = useState('');
  const [mLo, setMLo] = useState('');
  const [mHi, setMHi] = useState('');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const [pp, mm] = await Promise.all([
      supabase.from('blood_panels').select('*').order('panel_date', { ascending: false }),
      supabase.from('blood_markers').select('*').order('created_at'),
    ]);
    setPanels(pp.data || []); setMarkers(mm.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);
  const markersOf = (pid: string) => markers.filter((m) => m.panel_id === pid);

  function pickCatalog(k: string) {
    setMKey(k);
    const c = CATALOG.find((x) => x.key === k);
    if (c && k !== 'custom') { setMLabel(c.label); setMUnit(c.unit); }
    else { setMLabel(''); setMUnit(''); }
  }

  async function addPanel() {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from('blood_panels').insert({ user_id: userId, panel_date: pDate, lab_name: pLab.trim() || null, notes: pNotes.trim() || null }).select();
    if (error) { setBusy(false); setErr(error.message); return; }
    const panel = data[0];
    if (pFile) {
      const path = await uploadMedia(userId, 'medical', pFile);
      if (path) await supabase.from('blood_panels').update({ report_path: path }).eq('id', panel.id);
    }
    setBusy(false); setPLab(''); setPNotes(''); setPFile(null); setPDate(today());
    load();
  }
  async function deletePanel(id: string) {
    if (!confirm('Delete this panel and all its markers?')) return;
    const { error } = await supabase.from('blood_panels').delete().eq('id', id);
    if (!error) { setPanels((p) => p.filter((x) => x.id !== id)); setMarkers((m) => m.filter((x) => x.panel_id !== id)); }
  }
  async function addMarker(pid: string) {
    if (!mLabel.trim() || mValue === '') { setErr('Marker and value are required.'); return; }
    const flag = computeFlag(mValue, mLo, mHi);
    const { error } = await supabase.from('blood_markers').insert({
      panel_id: pid, marker: mLabel.trim(), value: Number(mValue), unit: mUnit || null,
      ref_low: mLo !== '' ? Number(mLo) : null, ref_high: mHi !== '' ? Number(mHi) : null, flag,
    });
    if (error) { setErr(error.message); return; }
    setMValue(''); setMLo(''); setMHi('');
    const { data } = await supabase.from('blood_markers').select('*').order('created_at');
    setMarkers(data || []);
  }
  async function removeMarker(id: string) {
    const { error } = await supabase.from('blood_markers').delete().eq('id', id);
    if (!error) setMarkers((m) => m.filter((x) => x.id !== id));
  }
  async function viewReport(path: string) {
    const url = await signedUrl(path, 600);
    if (url) window.open(url, '_blank');
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Blood Panels</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 640 }}>Your blood work — the single most predictive input. Copy the reference ranges straight from your lab report (they vary by lab); we flag out-of-range values automatically. This is data tracking, not a diagnosis.</div>

      <div className="card" style={{ padding: 18, marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 650, color: '#1a1625', marginBottom: 12 }}>New panel</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 150px' }} />
          <input value={pLab} onChange={(e) => setPLab(e.target.value)} placeholder="Lab name (optional)" style={{ ...inp, flex: '1 1 160px' }} />
          <input value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, flex: '2 1 180px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#6b6573', display: 'flex', alignItems: 'center', gap: 8 }}>
            Report (PDF/image, optional):
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setPFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5 }} />
          </label>
          <button onClick={addPanel} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Create panel'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 18 }}>Loading…</div>)
      : panels.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 16, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No panels yet. Add your most recent blood work above.</div>)
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
          {panels.map((p, i) => {
            const ms = markersOf(p.id);
            const open = editing === p.id;
            return (
              <motion.div key={p.id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 15.5, fontWeight: 650, color: '#1a1625' }}>{fmtDay(p.panel_date)}</span>
                    {p.lab_name && <span style={{ fontSize: 13, color: '#8a8390' }}> · {p.lab_name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {p.report_path && <button onClick={() => viewReport(p.report_path)} style={miniBtn}>View report</button>}
                    <button onClick={() => deletePanel(p.id)} style={{ ...miniBtn, color: '#e8788a', borderColor: '#f6d6db' }}>Delete</button>
                  </div>
                </div>
                {p.notes && <div style={{ fontSize: 12.5, color: '#8a8390', marginTop: 4 }}>{p.notes}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {ms.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, padding: '7px 10px', background: '#faf7f5', borderRadius: 8 }}>
                      <span style={{ flex: '1 1 140px', color: '#1a1625', fontWeight: 600 }}>{m.marker}</span>
                      <span style={{ flex: '0 0 auto', color: '#1a1625' }}>{m.value}{m.unit ? ` ${m.unit}` : ''}</span>
                      <span style={{ flex: '1 1 90px', fontSize: 12, color: '#a59fae' }}>{m.ref_low != null || m.ref_high != null ? `ref ${m.ref_low ?? '–'}–${m.ref_high ?? '–'}` : ''}</span>
                      {m.flag && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: FLAG_COLOR[m.flag], padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{m.flag}</span>}
                      <span onClick={() => removeMarker(m.id)} style={{ cursor: 'pointer', color: '#c3779a', fontWeight: 700 }}>×</span>
                    </div>
                  ))}
                  {ms.length === 0 && <div style={{ fontSize: 12.5, color: '#c3bdca' }}>No markers added yet.</div>}
                </div>

                {open ? (
                  <div style={{ marginTop: 10, padding: 10, background: '#fbfaff', borderRadius: 10, border: '1px solid #e7e0ff' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                      <select value={mKey} onChange={(e) => pickCatalog(e.target.value)} style={{ ...inp, flex: '1 1 130px', padding: '7px 9px' }}>
                        {CATALOG.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      {mKey === 'custom' && <input value={mLabel} onChange={(e) => setMLabel(e.target.value)} placeholder="marker name" style={{ ...inp, flex: '1 1 110px', padding: '7px 9px' }} />}
                      <input value={mValue} onChange={(e) => setMValue(e.target.value)} placeholder="value" inputMode="decimal" style={{ ...inp, width: 70, padding: '7px 9px' }} />
                      <input value={mUnit} onChange={(e) => setMUnit(e.target.value)} placeholder="unit" style={{ ...inp, width: 70, padding: '7px 9px' }} />
                      <input value={mLo} onChange={(e) => setMLo(e.target.value)} placeholder="ref low" inputMode="decimal" style={{ ...inp, width: 70, padding: '7px 9px' }} />
                      <input value={mHi} onChange={(e) => setMHi(e.target.value)} placeholder="ref high" inputMode="decimal" style={{ ...inp, width: 70, padding: '7px 9px' }} />
                      <button onClick={() => addMarker(p.id)} style={{ ...miniBtn, background: '#7c5cff', color: '#fff', border: 'none' }}>Add</button>
                    </div>
                    <button onClick={() => setEditing(null)} style={{ ...miniBtn, marginTop: 8 }}>Done</button>
                  </div>
                ) : (
                  <button onClick={() => { pickCatalog('ferritin'); setEditing(p.id); }} style={{ ...miniBtn, marginTop: 12 }}>+ Add marker</button>
                )}
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
const miniBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 12.5, cursor: 'pointer', color: '#6b6573' };
