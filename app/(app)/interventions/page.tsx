// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const TIMES = ['morning', 'midday', 'evening', 'night'];
const ZONES = ['frontal', 'vertex', 'part', 'temples', 'global'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function InterventionsPage() {
  const { userId } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState('all');

  const [date, setDate] = useState(today());
  const [productId, setProductId] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [zone, setZone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    if (!userId) return;
    setLoading(true);
    const [pr, iv] = await Promise.all([
      supabase.from('products').select('id,name,category').order('name'),
      supabase.from('interventions').select('*').order('log_date', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    setProducts(pr.data || []);
    setItems(iv.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  async function add() {
    if (!productId && !notes.trim()) { setErr('Pick a product or write a note (e.g. "scalp massage").'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('interventions').insert({
      user_id: userId, product_id: productId || null, log_date: date,
      time_of_day: timeOfDay || null, zone: zone || null, amount: amount.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setAmount(''); setNotes(''); setZone('');
    load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('interventions').delete().eq('id', id);
    if (!error) setItems((a) => a.filter((x) => x.id !== id));
  }

  const filtered = filterProduct === 'all' ? items : items.filter((i) => i.product_id === filterProduct);
  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    filtered.forEach((i) => { (m[i.log_date] ||= []).push(i); });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1625' }}>Interventions</div>
      <div style={{ fontSize: 14, color: '#8a8390', marginTop: 5, maxWidth: 620 }}>What you applied, and when. Product is optional — you can log an action like a scalp massage or a wash by writing a note.</div>

      <div className="card" style={{ padding: 18, marginTop: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} style={{ ...inp, flex: '1 1 150px' }} />
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ ...inp, flex: '2 1 180px' }}>
            <option value="">— no product (action) —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} style={{ ...inp, flex: '1 1 110px' }}>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={zone} onChange={(e) => setZone(e.target.value)} style={{ ...inp, flex: '1 1 110px' }}>
            <option value="">zone…</option>
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount (e.g. 1ml)" style={{ ...inp, flex: '1 1 110px' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (or describe the action)" style={{ ...inp, flex: '3 1 240px' }} />
          <button onClick={add} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Logging…' : 'Log'}</button>
        </div>
        {err && <div style={{ color: '#e8788a', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625' }}>History</div>
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} style={{ ...inp, padding: '7px 10px', fontSize: 13 }}>
          <option value="all">All products & actions</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (<div style={{ color: '#a59fae', fontSize: 14, marginTop: 16 }}>Loading…</div>)
      : byDay.length === 0 ? (<div className="card" style={{ padding: 24, marginTop: 12, textAlign: 'center', color: '#a59fae', fontSize: 14 }}>No interventions logged yet.</div>)
      : (
        <div style={{ marginTop: 14 }}>
          {byDay.map(([day, list]) => (
            <div key={day} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#a59fae', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{fmtDay(day)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((i) => (
                  <motion.div key={i.id} className="card" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                    style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7c5cff', background: '#f1ecff', padding: '3px 8px', borderRadius: 20, minWidth: 62, textAlign: 'center' }}>{i.time_of_day || '—'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#1a1625', fontWeight: 600 }}>{i.product_id ? (productMap[i.product_id]?.name || 'Product') : 'Action'}{i.zone ? <span style={{ fontWeight: 400, color: '#8a8390' }}> · {i.zone}</span> : null}{i.amount ? <span style={{ fontWeight: 400, color: '#8a8390' }}> · {i.amount}</span> : null}</div>
                      {i.notes && <div style={{ fontSize: 12.5, color: '#8a8390', marginTop: 2 }}>{i.notes}</div>}
                    </div>
                    <button onClick={() => remove(i.id)} style={{ ...miniBtn, color: '#c3779a', borderColor: '#f6d6db' }}>×</button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ece6e1', outline: 'none', fontSize: 14, background: '#fff', color: '#1a1625' };
const btn: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { padding: '5px 11px', borderRadius: 8, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 13, cursor: 'pointer', color: '#6b6573' };
