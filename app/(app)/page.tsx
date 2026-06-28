// @ts-nocheck
'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
const MODULES = [
  { href: '/products', icon: '🧴', title: 'Products & Actives', desc: 'Your shelf, by active ingredient', ready: true },
  { href: '/interventions', icon: '🗓️', title: 'Interventions', desc: 'What you applied, and when', ready: true },
  { href: '/routines', icon: '🔁', title: 'Routines', desc: 'Steps & adherence tracking', ready: true },
  { href: '/cycle', icon: '🌙', title: 'Cycle', desc: 'Period & hormonal markers', ready: true },
  { href: '/blood', icon: '🩸', title: 'Blood Panels', desc: 'Ferritin, thyroid, hormones…', ready: false },
  { href: '/photos', icon: '📸', title: 'Photos', desc: 'Constant-condition tracking', ready: false },
  { href: '/nutrition', icon: '🥗', title: 'Nutrition', desc: 'Key hair nutrients (from MFP)', ready: false },
  { href: '/biometrics', icon: '⌚', title: 'Biometrics', desc: 'Sleep, stress, HR', ready: false },
  { href: '/library', icon: '📚', title: 'Science Library', desc: 'Evidence & what actually works', ready: false },
  { href: '/lab', icon: '🔬', title: 'AL Analyst', desc: 'Your data analyst (later)', ready: false },
];
export default function Home() {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1625' }}>Welcome to your hair lab</div>
        <div style={{ fontSize: 14, color: '#8a8390', marginTop: 6, maxWidth: 560 }}>Log what you do, capture the conditions, and let the data reveal what actually moves the needle. This is a tracking tool — not a medical diagnosis.</div>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginTop: 28 }}>
        {MODULES.map((m, i) => {
          const card = (
            <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}
              style={{ padding: 18, position: 'relative', height: '100%', cursor: m.ready ? 'pointer' : 'default' }}>
              <div style={{ fontSize: 26 }}>{m.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 650, color: '#1a1625', marginTop: 8 }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: '#8a8390', marginTop: 3, lineHeight: 1.45 }}>{m.desc}</div>
              {!m.ready && (<span style={{ position: 'absolute', top: 14, right: 14, fontSize: 10.5, fontWeight: 600, color: '#7c5cff', background: '#f1ecff', padding: '3px 8px', borderRadius: 20 }}>SOON</span>)}
            </motion.div>
          );
          return m.ready
            ? <Link key={m.href} href={m.href} style={{ display: 'block' }}>{card}</Link>
            : <div key={m.href}>{card}</div>;
        })}
      </div>
    </div>
  );
}
