// @ts-nocheck
'use client';
import { supabase } from './supabase';

export const MARKER_LABEL: Record<string, string> = {
  ferritin: 'Ferritin', iron: 'Iron', transferrin_sat: 'Transferrin saturation', vitamin_d: 'Vitamin D',
  zinc: 'Zinc', b12: 'Vitamin B12', tsh: 'TSH', ft4: 'Free T4', testosterone: 'Testosterone',
  dhea_s: 'DHEA-S', fai: 'Free androgen index', prolactin: 'Prolactin',
};

// Conseil concret par marqueur flaggé (low / high). Toujours non-prescriptif + renvoi médecin.
const MARKER_ADVICE: Record<string, any> = {
  ferritin: { low: "Low iron stores are among the most common reversible causes of shedding in women, even without anemia. Bring this number to your doctor — many hair references aim higher than the lab's lower limit. Don't start iron on your own; too much is harmful. Pairing iron-rich food with vitamin C helps absorption." },
  iron: { low: "A low iron result fits the picture of iron-related shedding. Ask your doctor to look at it together with your ferritin before changing anything." },
  transferrin_sat: { low: "A low transferrin saturation can point to depleted iron. Worth reviewing alongside ferritin with your doctor." },
  vitamin_d: { low: "Low vitamin D is linked with shedding in some studies. Correcting a genuine deficiency is easy and broadly healthy — ask your doctor about a sensible dose rather than guessing." },
  zinc: { low: "A true zinc deficiency can drive hair loss. Confirm with your doctor before supplementing, since high doses interfere with copper." },
  b12: { low: "Low B12 can contribute to shedding, especially on plant-based diets. Correct it with your doctor's guidance." },
  tsh: { low: "Thyroid is a common, treatable cause of diffuse hair loss. A flagged TSH warrants a proper thyroid review — hair usually recovers once it's treated.", high: "Thyroid is a common, treatable cause of diffuse hair loss. A flagged TSH warrants a proper thyroid review — hair usually recovers once it's treated." },
  ft4: { low: "An abnormal free T4 supports looking at your thyroid. Discuss the full thyroid picture with your doctor.", high: "An abnormal free T4 supports looking at your thyroid. Discuss the full thyroid picture with your doctor." },
  testosterone: { high: "Elevated androgens can be linked with pattern thinning. This is worth discussing with a doctor rather than self-managing." },
  dhea_s: { high: "A high DHEA-S can be part of an androgen pattern. Worth raising with your doctor, sometimes an endocrinologist." },
  fai: { high: "A raised free androgen index can be linked with pattern thinning. Bring it to your doctor for context." },
  prolactin: { high: "Elevated prolactin can affect both hair and cycles. Flag it with your doctor." },
};

export async function getLibrarySignals(userId: string) {
  const { data: panels } = await supabase.from('blood_panels').select('id,panel_date').order('panel_date', { ascending: false }).limit(1);
  let markers: any[] = [];
  if (panels && panels.length) {
    const { data: m } = await supabase.from('blood_markers').select('marker,value,unit,flag').eq('panel_id', panels[0].id);
    markers = m || [];
  }
  const { data: shed } = await supabase.from('shedding_counts').select('log_date,count').order('log_date', { ascending: false }).limit(14);
  const { data: cyc } = await supabase.from('cycle_events').select('id').limit(1);

  const tags = new Set<string>();
  const actions: any[] = [];

  for (const mk of markers) {
    if (mk.flag === 'low' || mk.flag === 'high') {
      tags.add('marker:' + mk.marker);
      const adv = MARKER_ADVICE[mk.marker];
      if (adv && adv[mk.flag]) {
        const val = mk.value != null ? ` (${mk.value}${mk.unit ? ' ' + mk.unit : ''})` : '';
        actions.push({ tone: mk.flag, title: `${MARKER_LABEL[mk.marker] || mk.marker} is ${mk.flag}${val}`, text: adv[mk.flag] });
      }
    }
  }

  if (shed && shed.length) {
    const latest = shed[0].count;
    const vals = shed.map((s) => s.count).filter((n) => n != null);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    if (latest != null && (latest > 100 || (avg != null && latest > avg * 1.15))) {
      tags.add('signal:high_shedding');
      actions.push({ tone: 'low', title: `Your recent shedding is elevated (${latest}/day)`, text: 'Remember the 2-3 month lag — this likely reflects a trigger from a couple of months ago. Scan your Events and Cycle for that window, and check iron and thyroid with your doctor if it persists.' });
    }
  }
  if (cyc && cyc.length) tags.add('topic:cycle');
  tags.add('topic:shedding'); tags.add('topic:biology');

  return { tags: Array.from(tags), actions };
}

export function recommend(articles: any[], tags: string[]) {
  const set = new Set(tags);
  // priorise les correspondances marker:/signal: (plus personnelles) sur topic:
  const score = (a: any) => (a.tags || []).reduce((n: number, t: string) => n + (set.has(t) ? (t.startsWith('topic:') ? 1 : 3) : 0), 0);
  return articles.map((a) => ({ a, s: score(a) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).map((x) => x.a);
}
