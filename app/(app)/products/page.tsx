// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import ActivesLibrary from '@/components/ActivesLibrary';

const CATEGORIES = ['shampoo', 'conditioner', 'serum', 'topical', 'oil', 'mask', 'device', 'supplement-topical', 'other'];
const CAT_COLOR: Record<string, string> = { shampoo:'#7c5cff', conditioner:'#5c8cff', serum:'#e8788a', topical:'#3fb39a', oil:'#d59a3f', mask:'#a05cff', device:'#6b7280', 'supplement-topical':'#3f9ad5', other:'#9a8fae' };
const EV: Record<string, string> = { strong:'#3fb39a', moderate:'#5c8cff', limited:'#d59a3f', marketing:'#e8788a', unknown:'#9a8fae' };

export default function ProductsPage() {
  const { userId } = useAuth();
  const [tab, setTab] = useState('mine');
  const [products, setProducts] = useState<any[]>([]);
  const [actives, setActives] = useState<any[]>([]);
  const [pa, setPa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [addActiveId, setAddActiveId] = useState('');
  const [addConc, setAddConc] = useState('');
  const [addUnit, setAddUnit] = useState('%');

  const [name, setName] = useState(''); const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('serum'); const [form, setForm] = useState('');
  const [notes, setNotes] = useState(''); const [inUse, setInUse] = useState(true);

  async function loadAll() {
    if (!userId) return;
    setLoading(true);
    const [pr, ac, pac] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('actives').select('*'),
      supabase.from('product_actives').select('*, actives(*)'),
    ]);
    if (pr.error) setErr(pr.error.message);
    setProducts(pr.data || []); setActives(ac.data || []); setPa(pac.data || []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, [userId]);

  const activesOf = (pid: string) => pa.filter((x) => x.product_id === pid);

  async function addProduct() {
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('products').insert({ user_id: userId, name: name.trim(), brand: brand.trim() || null, category, form: form.trim() || null, notes: notes.trim() || null, in_use: inUse });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setName(''); setBrand(''); setForm(''); setNotes(''); setCategory('serum'); setInUse(true);
    loadAll();
  }
  async function removeProduct(id: string) {
    if (!confirm('Delete this product? Its active links will be removed too.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { setErr(error.message); return; }
    setProducts((p) => p.filter((x) => x.id !== id)); setPa((a) => a.filter((x) => x.product_id !== id));
  }
  async function toggleInUse(p: any) {
    const { error } = await supabase.from('products').update({ in_use: !p.in_use }).eq('id', p.id);
    if (!error) setProducts((arr) => arr.map((x) => (x.id === p.id ? { ...x, in_use: !x.in_use } : x)));
  }
  async function attachActive(pid: string) {
    if (!addActiveId) return;
    const { error } = await supabase.from('product_actives').insert({ product_id: pid, active_id: addActiveId, concentration: addConc ? Number(addConc) : null, unit: addUnit || null });
    if (error) { setErr(error.message); return; }
    setAddActiveId(''); setAddConc(''); setAddUnit('%');
    const { data } = await supabase.from('product_actives').select('*, actives(*)');
    setPa(data || []);
  }
  async function detachActive(paId: string) {
    const { error } = await supabase.from('product_actives').delete().eq('id', paId);
    if (!error) setPa((a) => a.filter((x) => x.id !== paId));
  }

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Products &amp; Actives</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 620 }}>Your shelf. Add each product once and tag its <b>active ingredients</b> — the analysis works on what is actually in the bottle, not the brand.</div>

      <div style={{ display: 'flex', gap: 6, marginTop: 20, borderBottom: '1px solid #ece6e1' }}>
        {[['mine', 'My products'], ['library', 'Actives library']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 14px', border: 'none', background: 'transparent', fontSize: 14, cursor: 'pointer',
            fontWeight: tab === k ? 700 : 500, color: tab === k ? '#7c5cff' : '#8a8390', borderBottom: tab === k ? '2px solid #7c5cff' : '2px solid transparent', marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === 'library' ? (
        <div style={{ marginTop: 18 }}><ActivesLibrary actives={actives} /></div>
      ) : (
        <div>
          <div className="card" style={{ padding: 18, marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 650, color: '#1a1625', marginBottom: 12 }}>Add a product</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" style={{ ...inp, flex: '2 1 200px' }} />
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" style={{ ...inp, flex: '1 1 140px' }} />
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inp, flex: '1 1 140px' }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form} onChange={(e) => setForm(e.target.value)} placeholder="Form (foam, liquid…)" style={{ ...inp, flex: '1 1 140px' }} />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, width: '100%', marginTop: 10, minHeight: 54, resize: 'vertical' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b6573', cursor: 'pointer' }}>
                <input type="checkbox" checked={inUse} onChange={(e) => setInUse(e.target.checked)} /> Currently in use
              </label>
              <button onClick={addProduct} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Adding…' : 'Add product'}</button>
            </div>
            {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26 }}>
            <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625' }}>My products</div>
            <div style={{ fontSize: 12.5, color: '#a59fae' }}>{products.length} item{products.length !== 1 ? 's' : ''}</div>
          </div>

          {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
          : products.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No products yet. Add your first one above.</div>)
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14, marginTop: 14 }}>
              {products.map((p, i) => {
                const links = activesOf(p.id);
                const attachedIds = links.map((l) => l.active_id);
                const open = editing === p.id;
                return (
                  <motion.div key={p.id} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}
                    style={{ padding: 16, opacity: p.in_use ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: CAT_COLOR[p.category] || '#9a8fae', padding: '3px 8px', borderRadius: 20 }}>{p.category || 'other'}</span>
                      {!p.in_use && <span style={{ fontSize: 10.5, color: '#a59fae' }}>paused</span>}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 650, color: '#1a1625', marginTop: 9 }}>{p.name}</div>
                    {p.brand && <div style={{ fontSize: 12.5, color: '#8a8390', marginTop: 1 }}>{p.brand}{p.form ? ` · ${p.form}` : ''}</div>}
                    {p.notes && <div style={{ fontSize: 12.5, color: '#6b6573', marginTop: 8, lineHeight: 1.45 }}>{p.notes}</div>}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {links.map((l) => (
                        <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#4a4453', background: '#faf7f5', border: '1px solid #ece6e1', padding: '3px 8px', borderRadius: 20 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 7, background: EV[l.actives?.evidence_level] || EV.unknown }} />
                          {l.actives?.name}{l.concentration ? ` ${l.concentration}${l.unit || ''}` : ''}
                          {open && <span onClick={() => detachActive(l.id)} style={{ cursor: 'pointer', color: '#c3779a', fontWeight: 700, marginLeft: 2 }}>×</span>}
                        </span>
                      ))}
                      {links.length === 0 && !open && <span style={{ fontSize: 11.5, color: '#c3bdca' }}>no actives tagged</span>}
                    </div>

                    {open && (
                      <div style={{ marginTop: 10, padding: 10, background: '#faf7f5', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <select value={addActiveId} onChange={(e) => setAddActiveId(e.target.value)} style={{ ...inp, flex: '2 1 120px', padding: '7px 9px' }}>
                          <option value="">+ active…</option>
                          {actives.filter((a) => !attachedIds.includes(a.id)).sort((a, b) => a.name.localeCompare(b.name)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <input value={addConc} onChange={(e) => setAddConc(e.target.value)} placeholder="conc." style={{ ...inp, width: 60, padding: '7px 9px' }} />
                        <input value={addUnit} onChange={(e) => setAddUnit(e.target.value)} placeholder="unit" style={{ ...inp, width: 56, padding: '7px 9px' }} />
                        <button onClick={() => attachActive(p.id)} style={{ ...miniBtn, background: '#7c5cff', color: '#fff', border: 'none' }}>Add</button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button onClick={() => setEditing(open ? null : p.id)} style={{ ...miniBtn, color: open ? '#7c5cff' : '#6b6573', borderColor: open ? '#d9ccff' : '#ece6e1' }}>{open ? 'Done' : 'Actives'}</button>
                      <button onClick={() => toggleInUse(p)} style={miniBtn}>{p.in_use ? 'Pause' : 'Resume'}</button>
                      <button onClick={() => removeProduct(p.id)} style={{ ...miniBtn, color: '#e8788a', borderColor: '#f6d6db' }}>Delete</button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 12.5, cursor: 'pointer', color: '#6b6573' };
