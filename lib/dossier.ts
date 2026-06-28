// @ts-nocheck
'use client';
import { supabase } from './supabase';

const dayAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const fmt = (d: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

// Assemble toutes les données loguées en un dossier markdown destiné à l'agent AL.
export async function buildDossier(userId: string): Promise<string> {
  const [prod, pa, rout, steps, rlogs, interv, cyc, panels, shed, nutr, bio, evt, photos, concl] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('product_actives').select('*, actives(name,evidence_level)'),
    supabase.from('routines').select('*'),
    supabase.from('routine_steps').select('*').order('ordre'),
    supabase.from('routine_logs').select('*').gte('log_date', dayAgo(14)),
    supabase.from('interventions').select('*').gte('log_date', dayAgo(30)).order('log_date', { ascending: false }),
    supabase.from('cycle_events').select('*').gte('log_date', dayAgo(180)).order('log_date', { ascending: false }),
    supabase.from('blood_panels').select('*').order('panel_date', { ascending: false }),
    supabase.from('shedding_counts').select('*').gte('log_date', dayAgo(60)).order('log_date', { ascending: false }),
    supabase.from('nutrition_logs').select('*').gte('log_date', dayAgo(14)),
    supabase.from('biometrics').select('*').gte('log_date', dayAgo(14)),
    supabase.from('events').select('*').gte('log_date', dayAgo(365)).order('log_date', { ascending: false }),
    supabase.from('photos').select('zone,log_date').order('log_date', { ascending: false }),
    supabase.from('conclusions').select('*').order('version', { ascending: false }).limit(1),
  ]);

  const products = prod.data || [], links = pa.data || [], routines = rout.data || [], rsteps = steps.data || [];
  const adher = rlogs.data || [], interventions = interv.data || [], cycle = cyc.data || [];
  const bloodPanels = panels.data || [], shedding = shed.data || [], nutrition = nutr.data || [], biometrics = bio.data || [];
  const events = evt.data || [], photoRows = photos.data || [], conclusion = (concl.data || [])[0];

  let markers: any[] = [];
  if (bloodPanels.length) {
    const mk = await supabase.from('blood_markers').select('*').eq('panel_id', bloodPanels[0].id);
    markers = mk.data || [];
  }

  const L: string[] = [];
  L.push('# Brunair — Hair Lab Dossier');
  L.push(`_Generated ${new Date().toLocaleString('en-GB')}_`);
  L.push('\n> Self-reported personal hair-tracking data, compiled for analysis. This is tracking data, not a medical record. Reference ranges are copied from the subject\'s own lab reports.');

  // Products & actives in use
  L.push('\n## Products in use (with active ingredients)');
  const inUse = products.filter((p) => p.in_use);
  if (!inUse.length) L.push('_None recorded._');
  inUse.forEach((p) => {
    const acts = links.filter((l) => l.product_id === p.id).map((l) => `${l.actives?.name}${l.concentration ? ` ${l.concentration}${l.unit || ''}` : ''} [${l.actives?.evidence_level || '?'}]`);
    L.push(`- **${p.name}**${p.brand ? ` (${p.brand})` : ''} — ${p.category || 'other'}${acts.length ? ` · actives: ${acts.join(', ')}` : ' · no actives tagged'}`);
  });

  // Routines + adherence
  L.push('\n## Routines & adherence (last 14 days)');
  const activeRoutines = routines.filter((r) => r.in_use);
  if (!activeRoutines.length) L.push('_None recorded._');
  activeRoutines.forEach((r) => {
    const st = rsteps.filter((s) => s.routine_id === r.id).map((s) => {
      const pn = s.product_id ? (products.find((p) => p.id === s.product_id)?.name || 'product') : '';
      return [pn, s.instruction].filter(Boolean).join(' — ');
    });
    const done = adher.filter((a) => a.routine_id === r.id && a.completed).length;
    L.push(`- **${r.name}** (${r.frequency || '—'}) · logged done ${done}× in 14d`);
    st.forEach((s, idx) => L.push(`  ${idx + 1}. ${s}`));
  });

  // Interventions
  L.push('\n## Interventions (last 30 days)');
  if (!interventions.length) L.push('_None recorded._');
  interventions.slice(0, 40).forEach((i) => {
    const pn = i.product_id ? (products.find((p) => p.id === i.product_id)?.name || 'product') : 'action';
    L.push(`- ${fmt(i.log_date)} · ${pn}${i.time_of_day ? ` (${i.time_of_day})` : ''}${i.zone ? ` · ${i.zone}` : ''}${i.notes ? ` — ${i.notes}` : ''}`);
  });

  // Cycle
  L.push('\n## Cycle (last 6 months)');
  const starts = cycle.filter((e) => e.type === 'period_start').map((e) => e.log_date).sort();
  if (starts.length) {
    let gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) gaps.push(Math.round((+new Date(starts[i]) - +new Date(starts[i - 1])) / 86400000));
    L.push(`- Period starts: ${starts.map(fmt).join(', ')}`);
    if (gaps.length) L.push(`- Average cycle length: ${avg(gaps)} days`);
  }
  const symEvents = cycle.filter((e) => e.symptoms?.length || e.notes);
  symEvents.slice(0, 12).forEach((e) => L.push(`- ${fmt(e.log_date)} · ${e.type}${e.flow ? ` (${e.flow})` : ''}${e.symptoms?.length ? ` — ${e.symptoms.join(', ')}` : ''}${e.notes ? ` — ${e.notes}` : ''}`));
  if (!cycle.length) L.push('_None recorded._');

  // Blood
  L.push('\n## Latest blood panel');
  if (bloodPanels.length) {
    L.push(`Date: ${fmt(bloodPanels[0].panel_date)}${bloodPanels[0].lab_name ? ` · ${bloodPanels[0].lab_name}` : ''}`);
    markers.forEach((m) => L.push(`- ${m.marker}: **${m.value}${m.unit ? ` ${m.unit}` : ''}**${m.ref_low != null || m.ref_high != null ? ` (ref ${m.ref_low ?? '–'}–${m.ref_high ?? '–'})` : ''}${m.flag ? ` → ${m.flag.toUpperCase()}` : ''}`));
  } else L.push('_No blood panel recorded._');

  // Shedding
  L.push('\n## Shedding (last 60 days)');
  if (shedding.length) {
    L.push(`- Latest: ${shedding[0].count} (${shedding[0].method}, ${fmt(shedding[0].log_date)})`);
    L.push(`- Average of last ${Math.min(shedding.length, 14)}: ${avg(shedding.slice(0, 14).map((s) => s.count).filter((n) => n != null))}`);
  } else L.push('_None recorded._');

  // Nutrition + biometrics summaries
  L.push('\n## Nutrition (avg, last 14 days)');
  if (nutrition.length) {
    const f = (k: string) => avg(nutrition.map((n) => n[k]).filter((v) => v != null));
    L.push(`- Calories ${f('calories') ?? '—'} kcal · Protein ${f('protein_g') ?? '—'} g · Iron ${f('iron_mg') ?? '—'} mg · Zinc ${f('zinc_mg') ?? '—'} mg · Vit D ${f('vit_d_iu') ?? '—'} IU · Omega-3 ${f('omega3_mg') ?? '—'} mg · Biotin ${f('biotin_ug') ?? '—'} µg`);
  } else L.push('_None recorded._');

  L.push('\n## Biometrics (avg, last 14 days)');
  if (biometrics.length) {
    const f = (k: string) => avg(biometrics.map((b) => b[k]).filter((v) => v != null));
    L.push(`- Sleep ${f('sleep_hours') ?? '—'} h · Sleep quality ${f('sleep_quality') ?? '—'}/5 · Resting HR ${f('resting_hr') ?? '—'} bpm · HRV ${f('hrv') ?? '—'} ms · Stress ${f('stress_level') ?? '—'}/5`);
  } else L.push('_None recorded._');

  // Events
  L.push('\n## Events timeline (last 12 months — telogen triggers)');
  if (!events.length) L.push('_None recorded._');
  events.forEach((e) => L.push(`- ${fmt(e.log_date)} · ${e.category}${e.severity ? ` (severity ${e.severity}/5)` : ''} — ${e.description || ''}`));

  // Photos meta
  L.push('\n## Photos available (for visual comparison — attach separately)');
  const byZone: Record<string, string[]> = {};
  photoRows.forEach((p) => { (byZone[p.zone] ||= []).push(fmt(p.log_date)); });
  const zk = Object.keys(byZone);
  if (!zk.length) L.push('_None recorded._');
  zk.forEach((z) => L.push(`- ${z}: ${byZone[z].length} photos (${byZone[z].slice(0, 6).join(', ')}${byZone[z].length > 6 ? '…' : ''})`));

  // Prior conclusions for continuity
  L.push('\n## Previous conclusions (for continuity)');
  L.push(conclusion?.content ? conclusion.content : '_No prior conclusions yet._');

  return L.join('\n');
}
