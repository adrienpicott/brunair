// @ts-nocheck
'use client';
import { supabase } from './supabase';

const dkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayAgo = (n: number) => { const d = new Date(Date.now() - n * 86400000); return dkey(d); };
function eachDay(aStr: string, bStr: string, cb: (k: string) => void) {
  let d = new Date(aStr + 'T00:00:00'); const end = new Date(bStr + 'T00:00:00');
  let guard = 0;
  while (d <= end && guard < 400) { cb(dkey(d)); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); guard++; }
}

// Métadonnées des couches (partagées par Home et l'onglet Calendar)
export const LAYER_META = [
  { key: 'period', label: 'Period', color: '#e8788a', emoji: '🌸' },
  { key: 'routine', label: 'Routine done', color: '#3fb39a', emoji: '🟢' },
  { key: 'intervention', label: 'Interventions', color: '#7c5cff', emoji: '🟣' },
  { key: 'shedding', label: 'Shedding', color: '#d59a3f', emoji: '🟠' },
  { key: 'event', label: 'Events', color: '#d4564f', emoji: '🔴' },
  { key: 'photo', label: 'Photos', color: '#5c8cff', emoji: '🔵' },
];

export async function buildCalendarData(userId: string) {
  const since = dayAgo(540);
  const [cyc, rl, rt, iv, pr, sh, ev, ph] = await Promise.all([
    supabase.from('cycle_events').select('*').gte('log_date', since),
    supabase.from('routine_logs').select('*').gte('log_date', since),
    supabase.from('routines').select('id,name'),
    supabase.from('interventions').select('*').gte('log_date', since),
    supabase.from('products').select('id,name'),
    supabase.from('shedding_counts').select('*').gte('log_date', since),
    supabase.from('events').select('*').gte('log_date', since),
    supabase.from('photos').select('zone,log_date').gte('log_date', since),
  ]);
  const cycle = cyc.data || [], rlogs = rl.data || [], routines = rt.data || [], interv = iv.data || [];
  const products = pr.data || [], shed = sh.data || [], events = ev.data || [], photos = ph.data || [];
  const rName = Object.fromEntries(routines.map((r) => [r.id, r.name]));
  const pName = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const byDay: Record<string, any> = {};
  const get = (k: string) => (byDay[k] ||= { period: false, routines: [], interventions: [], shedding: null, events: [], photos: [] });

  // Period spans (pair start/end ; open start -> +5 jours)
  const evs = cycle.filter((e) => ['period_start', 'period_end', 'spotting'].includes(e.type)).sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  let open: string | null = null;
  for (const e of evs) {
    if (e.type === 'spotting') { get(e.log_date).period = true; continue; }
    if (e.type === 'period_start') { if (open) eachDay(open, open, (k) => (get(k).period = true)); open = e.log_date; }
    else if (e.type === 'period_end' && open) { eachDay(open, e.log_date, (k) => (get(k).period = true)); open = null; }
  }
  if (open) { const s = new Date(open + 'T00:00:00'); const e2 = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 4); eachDay(open, dkey(e2), (k) => (get(k).period = true)); }

  rlogs.forEach((l) => { if (l.completed) get(l.log_date).routines.push(rName[l.routine_id] || 'routine'); });
  interv.forEach((i) => get(i.log_date).interventions.push({ name: i.product_id ? (pName[i.product_id] || 'product') : 'action', time: i.time_of_day }));
  shed.forEach((s) => { const d = get(s.log_date); d.shedding = s.count; });
  events.forEach((e) => get(e.log_date).events.push({ category: e.category, description: e.description }));
  photos.forEach((p) => get(p.log_date).photos.push({ zone: p.zone }));

  // Couches -> days maps (présence/valeur par jour)
  const layers: Record<string, Record<string, number>> = { period: {}, routine: {}, intervention: {}, shedding: {}, event: {}, photo: {} };
  Object.entries(byDay).forEach(([k, v]: any) => {
    if (v.period) layers.period[k] = 1;
    if (v.routines.length) layers.routine[k] = v.routines.length;
    if (v.interventions.length) layers.intervention[k] = v.interventions.length;
    if (v.shedding != null) layers.shedding[k] = v.shedding;
    if (v.events.length) layers.event[k] = v.events.length;
    if (v.photos.length) layers.photo[k] = v.photos.length;
  });

  return { layers, byDay };
}
