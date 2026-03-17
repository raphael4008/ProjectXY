"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Shield, AlertTriangle, Eye, Radio, Crosshair, TrendingUp, Database, Activity, ChevronRight, Zap } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThreatFeed {
    id: string;
    ts: string;
    ip: string;
    country: string;
    flag: string;
    type: string;
    confidence: number;
    actor?: string;
    mitre?: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ThreatActor {
    id: string;
    name: string;
    nation: string;
    flag: string;
    active: boolean;
    campaigns: number;
    targets: string[];
    tools: string[];
    color: string;
    lastSeen: string;
    ttps: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ACTORS: ThreatActor[] = [
    { id: 'apt41', name: 'APT-41 (Winnti)', nation: 'China', flag: '🇨🇳', active: true, campaigns: 14, targets: ['Finance', 'Healthcare', 'Defense'], tools: ['Cobalt Strike', 'DEADEYE', 'KEYPLUG'], color: 'text-red-400', lastSeen: '2h ago', ttps: ['T1190', 'T1059', 'T1078', 'T1041'] },
    { id: 'apt29', name: 'APT-29 (Cozy Bear)', nation: 'Russia', flag: '🇷🇺', active: true, campaigns: 22, targets: ['Government', 'Think Tanks', 'Energy'], tools: ['WellMess', 'BEATDROP', 'Mimikatz'], color: 'text-orange-400', lastSeen: '14h ago', ttps: ['T1566', 'T1055', 'T1003', 'T1021'] },
    { id: 'lazarus', name: 'Lazarus Group', nation: 'North Korea', flag: '🇰🇵', active: true, campaigns: 9, targets: ['Crypto', 'Banks', 'Media'], tools: ['BLINDINGCAN', 'HOPLIGHT', 'TRICKBOT'], color: 'text-rose-400', lastSeen: '6h ago', ttps: ['T1189', 'T1059', 'T1486', 'T1567'] },
    { id: 'sandworm', name: 'Sandworm (Unit 74455)', nation: 'Russia', flag: '🇷🇺', active: false, campaigns: 7, targets: ['Power Grid', 'ICS/OT', 'Government'], tools: ['BlackEnergy', 'Industroyer2', 'CaddyWiper'], color: 'text-amber-400', lastSeen: '3d ago', ttps: ['T1190', 'T1562', 'T1486'] },
    { id: 'ta453', name: 'TA453 (Charming Kitten)', nation: 'Iran', flag: '🇮🇷', active: true, campaigns: 11, targets: ['Academics', 'Journalists', 'Dissidents'], tools: ['PHOSPHOROUS', 'HYPERSCRAPE'], color: 'text-yellow-400', lastSeen: '1d ago', ttps: ['T1566.002', 'T1078', 'T1119'] },
];

const FEED_POOL: Omit<ThreatFeed, 'id' | 'ts'>[] = [
    { ip: '185.220.101.45', country: 'Germany (Tor)', flag: '🇩🇪', type: 'C2 Beacon', confidence: 98, actor: 'APT-41', mitre: 'T1071', severity: 'CRITICAL' },
    { ip: '194.165.16.72', country: 'Russia', flag: '🇷🇺', type: 'Credential Stuffing', confidence: 91, actor: 'APT-29', mitre: 'T1078', severity: 'HIGH' },
    { ip: '45.33.22.11', country: 'United States', flag: '🇺🇸', type: 'Data Exfiltration', confidence: 89, mitre: 'T1041', severity: 'HIGH' },
    { ip: '77.88.55.66', country: 'North Korea', flag: '🇰🇵', type: 'Spearphishing', confidence: 96, actor: 'Lazarus', mitre: 'T1566.001', severity: 'CRITICAL' },
    { ip: '103.244.212.18', country: 'China', flag: '🇨🇳', type: 'Port Scan', confidence: 74, mitre: 'T1046', severity: 'MEDIUM' },
    { ip: '91.108.4.226', country: 'Iran', flag: '🇮🇷', type: 'DNS Hijacking', confidence: 83, actor: 'TA453', mitre: 'T1071.004', severity: 'HIGH' },
    { ip: '2a00:1450:400f', country: 'Netherlands', flag: '🇳🇱', type: 'Brute Force', confidence: 68, severity: 'MEDIUM' },
    { ip: '223.111.13.161', country: 'China', flag: '🇨🇳', type: 'SQLi Probe', confidence: 77, severity: 'MEDIUM' },
];

const SEV_CFG = {
    CRITICAL: 'text-rose-400 bg-rose-950/60 border-rose-700',
    HIGH: 'text-orange-400 bg-orange-950/50 border-orange-700',
    MEDIUM: 'text-amber-400 bg-amber-950/40 border-amber-700',
    LOW: 'text-slate-400 bg-slate-900 border-slate-700',
};

// attack map dots (simplified lat/lng → percentage position)
const MAP_TARGETS = [
    { x: 18, y: 40, label: 'EU', risks: 3, hot: false },
    { x: 27, y: 42, label: 'RU', risks: 4, hot: true },
    { x: 80, y: 25, label: 'CN', risks: 6, hot: true },
    { x: 83, y: 20, label: 'KP', risks: 2, hot: false },
    { x: 52, y: 55, label: 'AF', risks: 1, hot: false },
    { x: 22, y: 55, label: 'US', risks: 7, hot: true },
    { x: 57, y: 30, label: 'IR', risks: 3, hot: false },
    { x: 62, y: 50, label: 'IN', risks: 2, hot: false },
];

export default function ThreatIntelligencePage() {
    const [feed, setFeed] = useState<ThreatFeed[]>([]);
    const [selectedActor, setSelectedActor] = useState<ThreatActor | null>(ACTORS[0]);
    const [stats, setStats] = useState({ total: 0, critical: 0, countries: 0 });

    const addFeed = useCallback((data: Omit<ThreatFeed, 'id' | 'ts'>) => {
        const evt: ThreatFeed = {
            ...data, id: `TI-${Math.floor(Math.random() * 90000 + 10000)}`,
            ts: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };
        setFeed(prev => {
            const next = [evt, ...prev].slice(0, 80);
            setStats({
                total: next.length,
                critical: next.filter(e => e.severity === 'CRITICAL').length,
                countries: new Set(next.map(e => e.country)).size,
            });
            return next;
        });
    }, []);

    useEffect(() => {
        FEED_POOL.slice(0, 5).forEach((e, i) => setTimeout(() => addFeed(e), i * 700));
        const t = setInterval(() => addFeed(FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)]), Math.random() * 8000 + 5000);
        return () => clearInterval(t);
    }, [addFeed]);

    return (
        <div className="flex flex-col h-screen bg-[#040608] text-slate-300 font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(0,80,180,0.08)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 px-6 py-3 border-b border-blue-900/30 bg-black/60 backdrop-blur flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Globe size={18} className="text-blue-400 animate-pulse" />
                    <div>
                        <h1 className="text-base font-bold text-blue-400 tracking-widest">GLOBAL THREAT INTELLIGENCE — GEOPOLITICAL OSINT FUSION</h1>
                        <p className="text-[9px] text-blue-900 tracking-widest">Live Feed · APT Profiles · Attack Map · MITRE ATT&CK Mapping · IOC Database</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/30 border border-blue-800 rounded text-blue-400 font-bold">
                        <Activity size={10} className="animate-pulse" /> DEFCON 3 — ELEVATED
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="relative z-10 grid grid-cols-3 border-b border-blue-900/20 bg-black/40 shrink-0">
                {[
                    { label: 'IOCs TRACKED', value: stats.total, color: 'text-blue-400' },
                    { label: 'CRITICAL THREATS', value: stats.critical, color: 'text-rose-400' },
                    { label: 'NATIONS', value: stats.countries, color: 'text-cyan-400' },
                ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center py-2.5 border-r border-blue-900/20 last:border-0">
                        <span className={clsx("text-2xl font-bold", s.color)}>{s.value}</span>
                        <span className="text-[8px] text-slate-700 tracking-widest">{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Live IOC Feed */}
                <div className="col-span-4 border-r border-blue-900/20 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-blue-900/20 bg-black/40 flex items-center gap-2 shrink-0">
                        <Radio size={10} className="text-blue-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-blue-400 tracking-widest">LIVE IOC STREAM</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {feed.map(e => (
                            <div key={e.id} className="px-3 py-2 border-b border-slate-900/60 hover:bg-slate-900/20 transition-colors cursor-default">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={clsx("text-[7px] font-bold px-1.5 py-0.5 rounded border", SEV_CFG[e.severity])}>{e.severity}</span>
                                    {e.mitre && <span className="text-[7px] border border-slate-800 text-slate-600 px-1 rounded">{e.mitre}</span>}
                                    <span className="text-[8px] text-slate-700 ml-auto">{e.ts}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{e.flag}</span>
                                    <span className="text-[10px] font-bold font-mono text-white">{e.ip}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-slate-500">{e.country}</span>
                                    <span className="text-[9px] text-blue-500">· {e.type}</span>
                                    {e.actor && <span className="text-[9px] text-rose-500 ml-auto font-bold">{e.actor}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: Attack Map + Actor List */}
                <div className="col-span-5 border-r border-blue-900/20 flex flex-col overflow-hidden">

                    {/* Attack Map */}
                    <div className="h-52 relative bg-black/60 border-b border-blue-900/20 shrink-0 overflow-hidden">
                        {/* SVG grid background */}
                        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0ea5e9" strokeWidth="0.3" />
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#grid)" />
                        </svg>

                        {/* Radar sweep */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent_340deg,rgba(6,182,212,0.06)_360deg)] animate-[spin_8s_linear_infinite] origin-center scale-150" />
                        </div>

                        {/* Continent dots with animated threat circles */}
                        {MAP_TARGETS.map((t, i) => (
                            <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${t.x}%`, top: `${t.y}%` }}>
                                {t.hot && <div className="absolute inset-0 rounded-full bg-rose-500 opacity-20 animate-ping scale-150" style={{ width: `${t.risks * 4}px`, height: `${t.risks * 4}px`, margin: `-${t.risks * 2}px` }} />}
                                <div className={clsx("rounded-full border", t.hot ? "bg-rose-500 border-rose-400 w-2.5 h-2.5 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-blue-600 border-blue-500 w-1.5 h-1.5")} />
                                {t.hot && <div className="absolute top-3 -left-4 text-[7px] text-rose-400 font-bold whitespace-nowrap">{t.label} ×{t.risks}</div>}
                            </div>
                        ))}

                        {/* Attack lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="80" y1="25" x2="22" y2="45" stroke="rgba(239,68,68,0.3)" strokeWidth="0.3" strokeDasharray="2,2" />
                            <line x1="27" y1="42" x2="22" y2="45" stroke="rgba(249,115,22,0.3)" strokeWidth="0.3" strokeDasharray="2,2" />
                            <line x1="83" y1="20" x2="22" y2="45" stroke="rgba(239,68,68,0.2)" strokeWidth="0.3" strokeDasharray="2,2" />
                        </svg>

                        <div className="absolute top-2 left-3 text-[9px] text-blue-500 font-bold tracking-widest">GLOBAL THREAT MAP — REAL-TIME</div>
                    </div>

                    {/* Threat Actor List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-3 py-2 border-b border-blue-900/20 bg-black/40 flex items-center gap-2">
                            <Crosshair size={10} className="text-rose-500" />
                            <span className="text-[9px] font-bold text-slate-400 tracking-widest">TRACKED THREAT ACTORS</span>
                        </div>
                        {ACTORS.map(actor => (
                            <div key={actor.id} onClick={() => setSelectedActor(actor)}
                                className={clsx("px-3 py-2.5 border-b border-slate-900/60 cursor-pointer transition-all hover:bg-slate-900/20",
                                    selectedActor?.id === actor.id && "bg-blue-950/10 border-l-2 border-l-blue-500")}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">{actor.flag}</span>
                                    <span className={clsx("text-[10px] font-bold", actor.color)}>{actor.name}</span>
                                    <span className={clsx("ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded border",
                                        actor.active ? "text-rose-400 border-rose-800 bg-rose-950/30 animate-pulse" : "text-slate-600 border-slate-700"
                                    )}>{actor.active ? 'ACTIVE' : 'DORMANT'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] text-slate-600">
                                    <span>Campaigns: <span className="text-slate-400">{actor.campaigns}</span></span>
                                    <span>Last seen: <span className={actor.active ? 'text-rose-500' : 'text-slate-500'}>{actor.lastSeen}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Actor Detail Inspector */}
                <div className="col-span-3 flex flex-col overflow-hidden">
                    {selectedActor ? (
                        <>
                            <div className={clsx("px-4 py-3 border-b bg-black/60 shrink-0", 'border-blue-900/30')}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-2xl">{selectedActor.flag}</span>
                                    <div>
                                        <h2 className={clsx("text-sm font-bold", selectedActor.color)}>{selectedActor.name}</h2>
                                        <p className="text-[9px] text-slate-600">{selectedActor.nation}</p>
                                    </div>
                                </div>
                                <div className={clsx("text-[8px] font-bold px-2 py-1 rounded border w-fit mt-1",
                                    selectedActor.active ? "text-rose-400 border-rose-800 bg-rose-950/30" : "text-slate-500 border-slate-700"
                                )}>{selectedActor.active ? '● ACTIVE CAMPAIGN' : '○ DORMANT'}</div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                                {/* Stat cards */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/40 border border-slate-800 rounded p-2">
                                        <div className="text-[7px] text-slate-600 tracking-widest">CAMPAIGNS</div>
                                        <div className={clsx("text-lg font-bold", selectedActor.color)}>{selectedActor.campaigns}</div>
                                    </div>
                                    <div className="bg-black/40 border border-slate-800 rounded p-2">
                                        <div className="text-[7px] text-slate-600 tracking-widest">LAST SEEN</div>
                                        <div className="text-xs font-bold text-slate-300">{selectedActor.lastSeen}</div>
                                    </div>
                                </div>

                                {/* Targets */}
                                <div className="bg-black/40 border border-slate-800 rounded p-3">
                                    <div className="text-[8px] text-slate-600 tracking-widest mb-2">PRIMARY TARGETS</div>
                                    {selectedActor.targets.map(t => (
                                        <div key={t} className="flex items-center gap-1.5 mb-1">
                                            <ChevronRight size={8} className="text-rose-600" />
                                            <span className="text-[10px] text-slate-300">{t}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Tools */}
                                <div className="bg-black/40 border border-slate-800 rounded p-3">
                                    <div className="text-[8px] text-slate-600 tracking-widest mb-2">KNOWN TOOLS</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedActor.tools.map(t => (
                                            <span key={t} className="text-[8px] bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* TTPs */}
                                <div className="bg-black/40 border border-slate-800 rounded p-3">
                                    <div className="text-[8px] text-slate-600 tracking-widest mb-2">MITRE ATT&CK TTPs</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedActor.ttps.map(t => (
                                            <span key={t} className={clsx("text-[8px] px-1.5 py-0.5 rounded border font-bold", selectedActor.color, 'border-current opacity-80')}>{t}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="space-y-1.5">
                                    <button className="w-full py-2 text-[9px] font-bold border border-rose-800 text-rose-400 rounded hover:bg-rose-950/30 transition-all flex items-center justify-center gap-1.5">
                                        <Zap size={10} /> GENERATE HUNTING PACKAGE
                                    </button>
                                    <button className="w-full py-2 text-[9px] font-bold border border-blue-800 text-blue-400 rounded hover:bg-blue-950/30 transition-all flex items-center justify-center gap-1.5">
                                        <Shield size={10} /> APPLY THREAT INTEL BLOCKS
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
                            <Globe size={28} />
                            <p className="text-[10px] tracking-widest">Select an actor to inspect</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
