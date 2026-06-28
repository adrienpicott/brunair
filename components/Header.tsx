// @ts-nocheck
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const NAV = [
  { href: '/', label: 'Home', ready: true },
  { href: '/products', label: 'Products', ready: true },
  { href: '/interventions', label: 'Interventions', ready: true },
  { href: '/routines', label: 'Routines', ready: true },
  { href: '/cycle', label: 'Cycle', ready: true },
  { href: '/blood', label: 'Blood Panels', ready: true },
  { href: '/photos', label: 'Photos', ready: false },
  { href: '/nutrition', label: 'Nutrition', ready: false },
  { href: '/biometrics', label: 'Biometrics', ready: false },
  { href: '/library', label: 'Library', ready: false },
  { href: '/lab', label: 'AL Analyst', ready: false },
];

export default function Header() {
  const { email, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  function NavItem({ item, block }: { item: any; block?: boolean }) {
    const active = isActive(item.href);
    const base: React.CSSProperties = { padding: block ? '11px 8px' : '7px 12px', borderRadius: 9, fontSize: 14, display: 'block' };
    if (!item.ready) {
      return (
        <span style={{ ...base, color: '#c3bdca', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.label}
          <span style={{ fontSize: 9, fontWeight: 700, color: '#b9b2c2', background: '#f1ecf5', padding: '2px 6px', borderRadius: 10 }}>SOON</span>
        </span>
      );
    }
    return (
      <Link href={item.href} onClick={() => setOpen(false)}
        style={{ ...base, fontWeight: active ? 700 : 500, color: active ? '#7c5cff' : '#4a4453', background: active ? '#f1ecff' : 'transparent' }}>
        {item.label}
      </Link>
    );
  }

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #ece6e1' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, color: '#1a1625' }}>
          Brunair <span style={{ color: '#7c5cff' }}>·</span> <span style={{ fontWeight: 500, fontSize: 13, color: '#a59fae' }}>hair lab</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="hidden sm:inline" style={{ fontSize: 13, color: '#8a8390' }}>{email}</span>
          <button onClick={signOut} style={{ padding: '7px 13px', borderRadius: 9, border: '1px solid #ece6e1', background: '#faf7f5', fontSize: 13, cursor: 'pointer', color: '#6b6573' }}>Sign out</button>
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu"
            style={{ padding: '6px 11px', borderRadius: 9, border: '1px solid #ece6e1', background: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
      <nav className="hidden md:flex" style={{ gap: 4, padding: '0 16px 10px', flexWrap: 'wrap' }}>
        {NAV.map((it) => <NavItem key={it.href} item={it} />)}
      </nav>
      {open && (
        <nav className="md:hidden" style={{ padding: '4px 12px 12px', borderTop: '1px solid #f1ecf5' }}>
          {NAV.map((it) => <NavItem key={it.href} item={it} block />)}
        </nav>
      )}
    </header>
  );
}
