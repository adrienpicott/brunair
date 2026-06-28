// @ts-nocheck
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { uploadMedia, signedUrl, deleteMedia } from '@/lib/storage';

const ZONES = [
  { key: 'frontal', label: 'Frontal hairline' },
  { key: 'vertex', label: 'Vertex (crown)' },
  { key: 'part', label: 'Part line' },
  { key: 'temples', label: 'Temples' },
  { key: 'global', label: 'Global' },
];
const LIGHTING = ['daylight', 'window', 'indoor', 'flash', 'other'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PhotosPage() {
  const { userId } = useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [ghostUrls, setGhostUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [zone, setZone] = useState('frontal');
  const [date, setDate] = useState(today());
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [lighting, setLighting] = useState('daylight');
  const [distance, setDistance] = useState('');
  const [dry, setDry] = useState(true);
  const [notes, setNotes] = useState('');
  const [ghostOpacity, setGhostOpacity] = useState(0.45);
  const inputRef = useRef<any>(null);
  const [galleryZone, setGalleryZone] = useState('frontal');
  const [galUrls, setGalUrls] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState(0.5);

  async function load() {
    if (!userId) return;
    const { data } = await supabase.from('photos').select('*').order('log_date', { ascending: false }).order('created_at', { ascending: false });
    setPhotos(data || []);
    // dernière photo par zone -> URL signée (fantôme)
    const latest: Record<string, any> = {};
    (data || []).forEach((p) => { if (!latest[p.zone]) latest[p.zone] = p; });
    const map: Record<string, string> = {};
    for (const z of Object.keys(latest)) {
      const u = await signedUrl(latest[z].storage_path, 600);
      if (u) map[z] = u;
    }
    setGhostUrls(map);
  }
  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    (async () => {
      const zonePhotos = photos.filter((p) => p.zone === galleryZone);
      const map: Record<string, string> = {};
      for (const p of zonePhotos) { const u = await signedUrl(p.storage_path, 600); if (u) map[p.id] = u; }
      setGalUrls(map);
    })();
  }, [galleryZone, photos]);

  function onPick(f: File | null) {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(f); setOk(null); setErr(null);
    setFileUrl(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    if (!file) { setErr('Choose a photo first.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const path = await uploadMedia(userId, 'photos', file);
    if (!path) { setBusy(false); setErr('Upload failed.'); return; }
    const conditions = { lighting, distance_cm: distance ? Number(distance) : null, dry };
    const { error } = await supabase.from('photos').insert({ user_id: userId, log_date: date, zone, storage_path: path, conditions, notes: notes.trim() || null });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onPick(null); if (inputRef.current) inputRef.current.value = '';
    setNotes(''); setDistance('');
    setOk('Saved ✓'); load();
  }
  async function deletePhoto(p: any) {
    if (!confirm('Delete this photo?')) return;
    await deleteMedia(p.storage_path);
    const { error } = await supabase.from('photos').delete().eq('id', p.id);
    if (!error) setPhotos((arr) => arr.filter((x) => x.id !== p.id));
  }

  const ghost = ghostUrls[zone];
  const countByZone = useMemo(() => { const m: Record<string, number> = {}; photos.forEach((p) => { m[p.zone] = (m[p.zone] || 0) + 1; }); return m; }, [photos]);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Photos</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 640 }}>Same light, same distance, dry hair, same angle — every time. The faded <b>ghost</b> of your last photo for this zone helps you line up the shot. Consistency is what makes the comparison meaningful.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 18, marginTop: 20, alignItems: 'start' }} className="photos-grid">
        {/* Aperçu + fantôme */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ position: 'relative', width: '100%', height: 340, borderRadius: 12, overflow: 'hidden', background: '#f3eee9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {fileUrl ? <img src={fileUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#bcae9e', fontSize: 13, textAlign: 'center', padding: 20 }}>Pick a photo to preview it here</span>}
            {ghost && fileUrl && <img src={ghost} alt="ghost" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ghostOpacity, pointerEvents: 'none' }} />}
          </div>
          {ghost && fileUrl && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#8a8390', marginBottom: 4 }}>Ghost overlay (last {zone}) — slide to align</div>
              <input type="range" min={0} max={1} step={0.05} value={ghostOpacity} onChange={(e) => setGhostOpacity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          {ghost && !fileUrl && <div style={{ fontSize: 11.5, color: '#a59fae', marginTop: 8 }}>A previous {zone} photo exists — it will appear as a ghost once you pick a new file.</div>}
        </div>

        {/* Formulaire */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <select value={zone} onChange={(e) => setZone(e.target.value)} style={{ ...inp, flex: '1 1 160px' }}>
              {ZONES.map((z) => <option key={z.key} value={z.key}>{z.label}{countByZone[z.key] ? ` (${countByZone[z.key]})` : ''}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 140px' }} />
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={(e) => onPick(e.target.files?.[0] || null)} style={{ marginTop: 12, fontSize: 13 }} />
          <div style={{ fontSize: 12.5, color: '#6b6573', marginTop: 16, marginBottom: 6 }}>Conditions (for consistency)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <select value={lighting} onChange={(e) => setLighting(e.target.value)} style={{ ...inp, flex: '1 1 130px' }}>
              {LIGHTING.map((l) => <option key={l} value={l}>{l} light</option>)}
            </select>
            <input value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="distance (cm)" inputMode="decimal" style={{ ...inp, flex: '1 1 120px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#6b6573', cursor: 'pointer' }}>
              <input type="checkbox" checked={dry} onChange={(e) => setDry(e.target.checked)} /> Dry hair
            </label>
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, width: '100%', marginTop: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <button onClick={save} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save photo'}</button>
            {ok && <span style={{ color: '#3fb39a', fontSize: 13, fontWeight: 600 }}>{ok}</span>}
            {err && <span style={{ color: '#e8788a', fontSize: 13 }}>{err}</span>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625' }}>Timeline by zone</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, borderBottom: '1px solid #ece6e1', paddingBottom: 2 }}>
          {ZONES.map((z) => (
            <button key={z.key} onClick={() => setGalleryZone(z.key)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', fontSize: 13.5, cursor: 'pointer',
              fontWeight: galleryZone === z.key ? 700 : 500, color: galleryZone === z.key ? '#7c5cff' : '#8a8390', borderBottom: galleryZone === z.key ? '2px solid #7c5cff' : '2px solid transparent', marginBottom: -3 }}>
              {z.label}{countByZone[z.key] ? ` (${countByZone[z.key]})` : ''}
            </button>
          ))}
        </div>
        {(() => {
          const zp = photos.filter((p) => p.zone === galleryZone);
          if (zp.length === 0) return <div className="card" style={{ padding: 22, marginTop: 14, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No photos for this zone yet.</div>;
          const latest = zp[0]; const earliest = zp[zp.length - 1];
          return (
            <div>
              {zp.length >= 2 && (
                <div className="card" style={{ padding: 14, marginTop: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, color: '#1a1625', marginBottom: 10 }}>Progress · earliest ↔ latest</div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 360, borderRadius: 12, overflow: 'hidden', background: '#f3eee9', margin: '0 auto' }}>
                    {galUrls[latest.id] && <img src={galUrls[latest.id]} alt="latest" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {galUrls[earliest.id] && <img src={galUrls[earliest.id]} alt="earliest" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: compare }} />}
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={compare} onChange={(e) => setCompare(Number(e.target.value))} style={{ width: '100%', maxWidth: 360, display: 'block', margin: '10px auto 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, margin: '4px auto 0', fontSize: 11.5, color: '#a59fae' }}>
                    <span>{fmtDay(latest.log_date)} (latest)</span><span>{fmtDay(earliest.log_date)} (earliest)</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginTop: 14 }}>
                {zp.map((p) => (
                  <div key={p.id} className="card" style={{ padding: 8 }}>
                    <div style={{ width: '100%', height: 150, borderRadius: 8, overflow: 'hidden', background: '#f3eee9' }}>
                      {galUrls[p.id] ? <img src={galUrls[p.id]} alt={p.zone} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%' }} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                      <span style={{ fontSize: 12, color: '#6b6573' }}>{fmtDay(p.log_date)}</span>
                      <span onClick={() => deletePhoto(p)} style={{ cursor: 'pointer', color: '#c3779a', fontWeight: 700, fontSize: 14 }}>×</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <style>{`@media (max-width: 720px){ .photos-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
