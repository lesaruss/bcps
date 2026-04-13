'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUserEmail(user.email || null); }); }, [supabase]);
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };
  return (<header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><Link href="/dashboard" className="flex items-center gap-3"><div className="relative w-10 h-10 sm:w-12 sm:h-12"><Image src="/bcps-logo.png" alt="BCPS Logo" fill className="object-contain" priority /></div><span className="hidden sm:inline text-xl font-semibold" style={{ color: '#1672A7' }}>BCPS Minutes</span></Link><div className="hidden sm:flex items-center gap-4">{userEmail && (<><span className="text-sm" style={{ color: '#525252' }}>{userEmail}</span><button onClick={handleSignOut} className="px-6 py-2 rounded-full font-medium text-sm transition-colors" style={{ backgroundColor: '#F4C436', color: '#262626' }}>Sign Out</button></>)}</div><div className="sm:hidden"><button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md" style={{ color: '#1672A7' }}><svg className="w6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg></button></div></div>{isMenuOpen && (<div className="sm:hidden pb-4 border-t border-gray-200">{userEmail && (<><p className="text-sm py-3" style={{ color: '#525252' }}>{userEmail}</p><button onClick={handleSignOut} className="w-full px-4 py-2 rounded-full font-medium text-sm" style={{ backgroundColor: '#F4C436', color: '#262626' }}>Sign Out</button></>)}</div>)}</div></header>);
}
