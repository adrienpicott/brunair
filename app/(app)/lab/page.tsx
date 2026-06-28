// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { buildDossier } from '@/lib/dossier';

const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function LabPage() {
  const { userId } = useAuth();
  const [tab, setTab] = useState('dossier');

  // Dossier
  const [dossier, setDossier] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Conclusions
  const [concl, setConcl] = useState<any>(null);
  const [conclText, setConclText] = useState('');
  const [conclBusy, setConclBusy] = useState(false);

  // Analyses
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [aType, setAType] = useState('lab_review');
  const [aText, setAText] = useState('');
  const [aBusy, setABusy] = useState(false);

  async function loadConcl() {
    const { data } = await supabase.from('conclusions').select('*').order('version', { ascending: false }).limit(1);
    const c = (data || [])[0]; setConcl(c || null); setConclText(c?.content || '');
  }
  async function loadAnalyses() {
    const { data } = await supabase.from('analyses').select('*').order('created_at', { ascending: false });
    setAnalyses(data || []);
  }
  useEffect(() => { if (userId) { loadConcl(); loadAnalyses(); } }, [userId]);

  async function generate() {
    setGenBusy(true); setCopied(false);
    try { setDossier(await buildDossier(userId)); } catch (e) { setDossier('Error building dossier: ' + e.message); }
    setGenBusy(false);
  }
  function copyDossier() { navigator.clipboard.writeText(dossier); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  function downloadDossier() {
    const blob = new Blob([dossier], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `brunhair-dossier-${new Date().toISOString().slice(0, 10)}.md`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function saveConcl() {
    setConclBusy(true);
    const nextV = (concl?.version || 0) + 1;
    const { error } = await supabase.from('conclusions').insert({ user_id: userId, version: nextV, content: conclText });
    setConclBusy(false);
    if (!error) loadConcl();
  }

  async function saveAnalysis() {
    if (!aText.trim()) return;
    setABusy(true);
    const { error } = await supabase.from('analyses').insert({ user_id: userId, type: aType, output: aText.trim(), input_summary: 'pasted from AL project', model: 'AL project' });
    setABusy(false);
    if (!error) { setAText(''); loadAnalyses(); }
  }
  async function delAnalysis(id: string) {
    const { error } = await supabase.from('analyses').delete().eq('id', id);
    if (!error) setAnalyses((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>AL Analyst</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 660 }}>Your data lab. Generate a dossier of everything you've logged, hand it to your AL project for analysis, then save the conclusions back here. The analyst proposes hypotheses — it is not a diagnosis.</div>

      <div style={{ display: 'flex', gap: 6, marginTop: 20, borderBottom: '1px solid #ece6e1' }}>
        {[['dossier', 'Data dossier'], ['conclusions', 'Conclusions'], ['analyses', 'Analyses log']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 14px', border: 'none', background: 'transparent', fontSize: 14, cursor: 'pointer',
            fontWeight: tab === k ? 700 : 500, color: tab === k ? '#7c5cff' : '#8a8390', borderBottom: tab === k ? '2px solid #7c5cff' : '2px solid transparent', marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === 'dossier' && (
        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: 16, background: '#fbfaff', borderColor: '#e7e0ff', fontSize: 13, color: '#6b6573', lineHeight: 1.5 }}>
            <b style={{ color: '#1a1625' }}>How to use:</b> 1) Generate the dossier · 2) Copy or download it · 3) Paste it into your <b>AL</b> Claude project and ask for an analysis · 4) Paste the result into the <b>Analyses log</b> and update <b>Conclusions</b>. (Photos are listed by date — attach the images in your project separately.)
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={generate} disabled={genBusy} style={{ ...btn, opacity: genBusy ? 0.6 : 1 }}>{genBusy ? 'Building…' : 'Generate dossier'}</button>
            {dossier && <button onClick={copyDossier} style={btnLight}>{copied ? 'Copied ✓' : 'Copy'}</button>}
            {dossier && <button onClick={downloadDossier} style={btnLight}>Download .md</button>}
          </div>
          {dossier && <textarea readOnly value={dossier} style={{ ...inp, width: '100%', marginTop: 14, minHeight: 380, fontFamily: 'ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.5 }} />}
        </div>
      )}

      {tab === 'conclusions' && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12.5, color: '#a59fae', marginBottom: 8 }}>{concl ? `Version ${concl.version} · updated ${fmt(concl.updated_at)}` : 'No conclusions yet — paste the analyst\'s living conclusions here.'}</div>
          <textarea value={conclText} onChange={(e) => setConclText(e.target.value)} placeholder="The living 'Hypotheses & Conclusions' document. Update it after each lab review." style={{ ...inp, width: '100%', minHeight: 360, fontSize: 13.5, lineHeight: 1.55 }} />
          <button onClick={saveConcl} disabled={conclBusy} style={{ ...btn, marginTop: 12, opacity: conclBusy ? 0.6 : 1 }}>{conclBusy ? 'Saving…' : 'Save new version'}</button>
        </div>
      )}

      {tab === 'analyses' && (
        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={aType} onChange={(e) => setAType(e.target.value)} style={{ ...inp, flex: '0 0 160px' }}>
                <option value="checkin">Quick check-in</option>
                <option value="lab_review">Lab review</option>
              </select>
              <span style={{ fontSize: 12.5, color: '#a59fae' }}>Paste the analyst's output below.</span>
            </div>
            <textarea value={aText} onChange={(e) => setAText(e.target.value)} placeholder="Paste the AL analysis here…" style={{ ...inp, width: '100%', marginTop: 10, minHeight: 160, fontSize: 13.5 }} />
            <button onClick={saveAnalysis} disabled={aBusy} style={{ ...btn, marginTop: 10, opacity: aBusy ? 0.6 : 1 }}>{aBusy ? 'Saving…' : 'Save analysis'}</button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 24 }}>Past analyses</div>
          {analyses.length === 0 ? (<div className="card" style={{ padding: 22, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No analyses saved yet.</div>)
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {analyses.map((a) => (
                <div key={a.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: a.type === 'lab_review' ? '#7c5cff' : '#3fb39a', padding: '3px 9px', borderRadius: 20 }}>{a.type === 'lab_review' ? 'Lab review' : 'Check-in'}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#a59fae' }}>{fmt(a.created_at)}</span>
                      <span onClick={() => delAnalysis(a.id)} style={{ cursor: 'pointer', color: '#c3779a', fontWeight: 700 }}>×</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#4a4453', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{a.output}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625', resize: 'vertical' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnLight: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 14, cursor: 'pointer', color: '#6b6573' };
