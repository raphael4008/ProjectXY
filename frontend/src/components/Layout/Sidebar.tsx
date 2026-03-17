"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Network, Map, ShieldAlert, ThermometerSun, Lock, Globe, Activity, KeyRound, Shield, Skull, Siren, Search } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
    { name: 'Situation Room', path: '/', icon: LayoutDashboard, color: 'text-cyan-500', activeColor: 'text-cyan-400 border-cyan-500 bg-cyan-950/20' },
    { name: 'Intel Graph', path: '/entities', icon: Network, color: 'text-indigo-500', activeColor: 'text-indigo-400 border-indigo-500 bg-indigo-950/20' },
    { name: 'Intelligence Map', path: '/intelligence', icon: Globe, color: 'text-blue-500', activeColor: 'text-blue-400 border-blue-500 bg-blue-950/20' },
    { name: 'Anomaly Matrix', path: '/anomalies', icon: Activity, color: 'text-amber-500', activeColor: 'text-amber-400 border-amber-500 bg-amber-950/20' },
    { name: 'Red Team Ops', path: '/redteam', icon: Skull, color: 'text-red-500', activeColor: 'text-red-400 border-red-500 bg-red-950/20' },
    { name: '⚡ Exploit Workbench', path: '/redteam/exploits', icon: Siren, color: 'text-rose-600', activeColor: 'text-rose-400 border-rose-600 bg-rose-950/30' },
    { name: 'Blue Team SOC', path: '/defense', icon: Shield, color: 'text-emerald-500', activeColor: 'text-emerald-400 border-emerald-500 bg-emerald-950/20' },
    { name: '🔍 Threat Hunt', path: '/defense/hunt', icon: Search, color: 'text-emerald-600', activeColor: 'text-emerald-300 border-emerald-600 bg-emerald-950/30' },
    { name: 'Ghost Shell', path: '/ghost', icon: ShieldAlert, color: 'text-purple-500', activeColor: 'text-purple-400 border-purple-500 bg-purple-950/20' },
    { name: 'Asset Recovery', path: '/devices', icon: Map, color: 'text-slate-400', activeColor: 'text-slate-300 border-slate-400 bg-slate-800/40' },
    { name: 'Guardian', path: '/guardian', icon: Lock, color: 'text-slate-400', activeColor: 'text-slate-300 border-slate-400 bg-slate-800/40' },
    { name: 'Threat Heatmaps', path: '/heatmaps', icon: ThermometerSun, color: 'text-orange-500', activeColor: 'text-orange-400 border-orange-500 bg-orange-950/20' },
    { name: 'Immutable Ledger', path: '/ledger', icon: KeyRound, color: 'text-indigo-400', activeColor: 'text-indigo-300 border-indigo-500 bg-indigo-950/20' },
];

const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className="w-16 lg:w-60 bg-[#070709] border-r border-slate-900 flex flex-col h-screen fixed left-0 top-0 z-40">
            {/* Logo */}
            <div className="h-14 flex items-center justify-center lg:justify-start lg:px-5 border-b border-slate-900 shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded flex items-center justify-center font-black text-white text-sm shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                    XY
                </div>
                <div className="hidden lg:block ml-3">
                    <p className="font-black text-white tracking-widest text-sm">PROJECT XY</p>
                    <p className="text-[8px] text-slate-700 tracking-widest">SOVEREIGN INTELLIGENCE</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            prefetch={false}
                            className={clsx(
                                "flex items-center px-2 lg:px-3 py-2.5 rounded transition-all group border-l-2",
                                isActive
                                    ? item.activeColor
                                    : "text-slate-600 hover:bg-slate-900/60 hover:text-slate-300 border-transparent"
                            )}
                        >
                            <Icon size={18} className="shrink-0" />
                            <span className="hidden lg:block ml-3 text-xs font-medium tracking-wide">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Status */}
            <div className="p-4 border-t border-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    <span className="hidden lg:block text-[9px] text-slate-600 tracking-widest">SYSTEM ONLINE</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
