'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import {
    Shield, Activity, Cpu, Radar, Terminal, ChevronDown, AlertTriangle,
    BrainCircuit, Zap, Eye, Network, Lock, Globe, TrendingUp,
    CheckCircle2, XCircle, Clock, Radio, Target, Crosshair
} from 'lucide-react';
import { GodsEyeGraph } from '@/components/vanguard/GodsEyeGraph';
import { ActionTerminal } from './ActionTerminal';
import { GlobalOpsMap } from './GlobalOpsMap';
import { CommandCenter } from '@/components/CommandCenter';
import { GlassDossier, type EntityData } from '@/components/CommandCenter/GlassDossier';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreatEvent {
    id: string;
    ts: string;
    text: string;
    confidence: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    technique?: string;
    src_ip?: string;
}

interface LiveMetric {
    label: string;
    value: string | number;
    delta?: string;
    positive?: boolean;
    color: string;
    icon: React.ReactNode;
}

// ─── Threat Severity Config ───────────────────────────────────────────────────

const SEV_CFG = {
    CRITICAL: { dot: 'bg-rose-500', text: 'text-rose-400', badge: 'bg-rose-950/50 border-rose-700 text-rose-400', glow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]' },
    HIGH: { dot: 'bg-orange-500', text: 'text-orange-400', badge: 'bg-orange-950/40 border-orange-700 text-orange-400', glow: '' },
    MEDIUM: { dot: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-950/30 border-amber-700 text-amber-400', glow: '' },
    LOW: { dot: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-950/30 border-emerald-700 text-emerald-400', glow: '' },
    INFO: { dot: 'bg-slate-500', text: 'text-slate-400', badge: 'bg-slate-900 border-slate-700 text-slate-400', glow: '' },
};

// ─── AI Threat Events Pool (simulated live feed)  ────────────────────────────

const THREAT_POOL: Omit<ThreatEvent, 'id' | 'ts'>[] = [
    { text: 'Anomalous DNS query volume from 10.0.1.45 — possible C2 beacon over DoH', severity: 'HIGH', confidence: 87, technique: 'T1071.004', src_ip: '10.0.1.45' },
    { text: 'Lateral movement: SMB session established between 10.0.1.45 → 10.0.1.12 (non-standard hours)', severity: 'CRITICAL', confidence: 94, technique: 'T1021.002', src_ip: '10.0.1.45' },
    { text: 'New scheduled task created on endpoint WIN-SRV-04 — persistence indicator', severity: 'HIGH', confidence: 78, technique: 'T1053.005' },
    { text: 'UEBA anomaly: admin@corp.com logged in from 2 geographically impossible locations simultaneously', severity: 'CRITICAL', confidence: 99, technique: 'T1078' },
    { text: 'Exfiltration signal: 2.3GB upload to Mega.nz CDN from FILESERVER-01', severity: 'CRITICAL', confidence: 92, technique: 'T1567.002', src_ip: '10.0.5.11' },
    { text: 'Honeypot trap triggered: entity 185.220.101.45 enumerated fake credentials', severity: 'HIGH', confidence: 100, src_ip: '185.220.101.45' },
    { text: 'LSASS memory read detected on DC-01 — credential dumping attempt in progress', severity: 'CRITICAL', confidence: 96, technique: 'T1003.001' },
    { text: 'New user account created with Domain Admin rights: svc_monitor_hidden', severity: 'HIGH', confidence: 88, technique: 'T1098' },
    { text: 'Baseline deviation: CPU 340% above normal on database server DB-PROD-02', severity: 'MEDIUM', confidence: 73 },
    { text: 'SPF/DKIM mismatch on inbound email from vendor domain — spearphishing risk', severity: 'MEDIUM', confidence: 68, technique: 'T1566.001' },
    { text: 'Omni-Probe sweep detected 3 new unregistered devices on VLAN 10', severity: 'LOW', confidence: 81 },
    { text: 'Zero-Trust evaluation failed for 192.168.1.88 — device fingerprint mismatch', severity: 'HIGH', confidence: 91, technique: 'T1078.001' },
    { text: 'AI Correlation: IP 185.220.101.45 matches known Cobalt Strike beacon profile', severity: 'CRITICAL', confidence: 95, technique: 'T1071', src_ip: '185.220.101.45' },
    { text: 'Firewall exception modification detected — outbound rule added for port 4444', severity: 'HIGH', confidence: 84, technique: 'T1562.004' },
    { text: 'Sentinel Catalyst deployed YARA rule: COBALT_STRIKE_BEACON_001 → 7 endpoints', severity: 'INFO', confidence: 100 },
    { text: 'Ghost Protocol activated: Honeypot infrastructure responding on 192.168.1.250', severity: 'INFO', confidence: 100 },
    { text: 'Hive-Mind vaccine distributed to 12 tenant nodes for IOC block: 185.220.101.45', severity: 'INFO', confidence: 100 },
    { text: 'Geofence breach alert: Device MOB-0023 left authorized zone (Building A perimeter)', severity: 'MEDIUM', confidence: 77 },
    { text: 'Ransomware killswitch pattern detected in memory of WORKSTN-089 — pre-detonation phase', severity: 'CRITICAL', confidence: 97, technique: 'T1486' },
    { text: 'PQC key rotation completed — all 14 inter-node channels now quantum-resistant', severity: 'INFO', confidence: 100 },
];

// ─── Live ROE status bar ──────────────────────────────────────────────────────

const ROE_CFG = {
    PASSIVE: { color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-600', desc: 'Monitor only — no autonomous response', glow: '' },
    DEFENSIVE: { color: 'text-amber-400', bg: 'bg-amber-900/60', border: 'border-amber-600', desc: 'Isolate & contain — approval required for offensive action', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
    AGGRESSIVE: { color: 'text-rose-400', bg: 'bg-rose-900/60', border: 'border-rose-600', desc: 'Full autonomous response — active counter-measures enabled', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SituationRoom: React.FC = () => {
    const router = useRouter();

    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [roeLevel, setRoeLevel] = useState<'PASSIVE' | 'DEFENSIVE' | 'AGGRESSIVE'>('PASSIVE');
    const [viewMode, setViewMode] = useState<'LOCAL' | 'GLOBAL'>('LOCAL');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [globalVaccines, setGlobalVaccines] = useState<{ ip: string; origin: string }[]>([]);

    // Live threat feed state
    const [threatFeed, setThreatFeed] = useState<ThreatEvent[]>([]);
    const [criticalCount, setCriticalCount] = useState(0);
    const [blockedCount, setBlockedCount] = useState(0);
    const [alertsToday, setAlertsToday] = useState(0);
    const [systemHealth, setSystemHealth] = useState(98);

    // Active threat pulser (creates an always-updating live feel)
    const feedRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const threatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const globeRef = useRef<any>(null);

    // ─── Add live threat event ──────────────────────────────────────────────

    const addThreat = useCallback((event: Omit<ThreatEvent, 'id' | 'ts'>) => {
        const entry: ThreatEvent = {
            ...event,
            id: `${Date.now()}-${Math.random()}`,
            ts: new Date().toLocaleTimeString(),
        };
        setThreatFeed(prev => [entry, ...prev].slice(0, 60));
        if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
            setCriticalCount(c => c + 1);
            setAlertsToday(a => a + 1);
        } else {
            setAlertsToday(a => a + 1);
        }
    }, []);

    // ─── Initial data load ──────────────────────────────────────────────────

    useEffect(() => {
        const loadIntel = async () => {
            try {
                const gData = await api.getGraph();
                setGraphData(gData);
            } catch (err: any) {
                if (err?.status === 401 || String(err?.message).toLowerCase().includes('unauthorized')) {
                    router.push('/login');
                }
            }
        };
        loadIntel();
    }, [router]);

    // ─── Simulate live threat stream (replace with backend WS in production) ─

    useEffect(() => {
        // Inject a burst of initial events for immediate visual impact
        const initial = THREAT_POOL.slice(0, 6);
        initial.forEach((ev, i) => {
            setTimeout(() => addThreat(ev), i * 400);
        });

        // Then continuously inject random events every 4–12 seconds
        threatIntervalRef.current = setInterval(() => {
            const ev = THREAT_POOL[Math.floor(Math.random() * THREAT_POOL.length)];
            addThreat(ev);
            // Occasionally simulate a blocked threat
            if (Math.random() > 0.6) setBlockedCount(b => b + 1);
            if (Math.random() > 0.8) setSystemHealth(h => Math.max(70, Math.min(100, h + (Math.random() > 0.5 ? 1 : -2))));
        }, Math.random() * 8000 + 4000);

        return () => {
            if (threatIntervalRef.current) clearInterval(threatIntervalRef.current);
        };
    }, [addThreat]);

    // ─── WebSocket real-time telemetry ──────────────────────────────────────

    useEffect(() => {
        socketClient.connect();

        socketClient.subscribe('ALERT', (data: any) => addThreat({
            text: data.insight || data.message || 'Unknown alert',
            severity: data.level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            confidence: Math.round(data.confidence || 85),
            technique: data.technique,
            src_ip: data.src_ip,
        }));

        socketClient.subscribe('THREAT_INTERCEPT', (data: any) => {
            addThreat({ text: `AI intercept: ${data.message || 'Lateral movement blocked'}`, severity: 'CRITICAL', confidence: 95 });
            setBlockedCount(b => b + 1);
        });

        socketClient.subscribe('GLOBAL_INOCULATION_EVENT', (data: any) => {
            setGlobalVaccines(prev => [{ ip: data.threat_ip, origin: data.origin }, ...prev].slice(0, 3));
            addThreat({ text: `Hive-Mind vaccine deployed for ${data.threat_ip} (Origin: ${data.origin})`, severity: 'INFO', confidence: 100 });
            setBlockedCount(b => b + 1);
        });

        return () => {
            socketClient.unsubscribe('ALERT', () => { });
            socketClient.unsubscribe('THREAT_INTERCEPT', () => { });
            socketClient.unsubscribe('GLOBAL_INOCULATION_EVENT', () => { });
        };
    }, [addThreat]);

    // ─── Click-outside for dropdown ─────────────────────────────────────────

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // ─── Auto-scroll threat feed ────────────────────────────────────────────

    // (Feed is newest-first so no need to scroll)

    const handleExecuteAction = (command: string) => {
        addThreat({ text: `Operator override: ${command}`, severity: 'INFO', confidence: 100 });
        if (command.startsWith('ISOLATE')) setBlockedCount(b => b + 1);
    };

    const roe = ROE_CFG[roeLevel];

    // ─── Metrics panel data ─────────────────────────────────────────────────

    const liveMetrics: LiveMetric[] = [
        { label: 'THREATS DETECTED', value: alertsToday, color: 'text-rose-400', delta: '+' + alertsToday, positive: false, icon: <AlertTriangle size={14} className="text-rose-500" /> },
        { label: 'THREATS BLOCKED', value: blockedCount, color: 'text-emerald-400', delta: '+' + blockedCount, positive: true, icon: <Shield size={14} className="text-emerald-500" /> },
        { label: 'CRITICAL ALERTS', value: criticalCount, color: 'text-orange-400', delta: '', positive: false, icon: <Zap size={14} className="text-orange-500" /> },
        { label: 'SYSTEM HEALTH', value: `${systemHealth}%`, color: systemHealth > 85 ? 'text-emerald-400' : 'text-amber-400', delta: '', positive: true, icon: <Activity size={14} className="text-cyan-500" /> },
    ];

    // ─── Cyber command menu ─────────────────────────────────────────────────

    const cyberMenuItems = [
        { icon: <Shield size={13} />, label: 'GHOST PROTOCOL', desc: 'Deploy honeypots & deceptive lattice', action: 'ENGAGE GHOST PROTOCOL' },
        { icon: <Activity size={13} />, label: 'PULSE TRACE', desc: 'Kinetic network motion tracking', action: 'PULSE_TRACE --subnet ALL' },
        { icon: <Terminal size={13} className="text-rose-500" />, label: 'THE SPEAR (AEG)', desc: 'Autonomous Exploit Generation', action: 'SPEAR-AEG --mode AUTO' },
        { icon: <Cpu size={13} className="text-amber-500" />, label: 'THE FORGE (PQC)', desc: 'Generate quantum-resistant keys', action: 'FORGE-PQC' },
        { icon: <Radar size={13} className="text-purple-500" />, label: 'THE ORACLE', desc: 'Predictive threat forecasting', action: 'ORACLE-PREDICT' },
        { icon: <Globe size={13} className="text-cyan-500" />, label: 'OMNI-PROBE', desc: 'Launch full-spectrum network scan', action: 'SCAN --target LOCAL_SUBNET' },
    ];

    return (
        <div className="grid grid-cols-12 w-full h-full bg-[#050505] text-slate-300 font-mono overflow-hidden">

            {/* ── LEFT PANEL: Threat Intelligence Feed ── */}
            <div className="col-span-3 h-full flex flex-col border-r border-slate-800/60">

                {/* Live metrics */}
                <div className="grid grid-cols-2 border-b border-slate-800/60 shrink-0">
                    {liveMetrics.map((m, i) => (
                        <div key={i} className={clsx("flex flex-col items-center py-3 border-r border-b border-slate-800/60 last:border-r-0", i >= 2 && "border-b-0")}>
                            <div className="flex items-center gap-1 mb-0.5">{m.icon}</div>
                            <span className={clsx("text-xl font-bold font-mono", m.color)}>{m.value}</span>
                            <span className="text-[8px] text-slate-700 tracking-wider text-center leading-tight">{m.label}</span>
                        </div>
                    ))}
                </div>

                {/* Threat Feed Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60 bg-[#0a0a0a] shrink-0">
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={12} className="text-indigo-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-indigo-400 tracking-widest">AI THREAT INTELLIGENCE</span>
                    </div>
                    <span className="text-[8px] text-slate-600">{threatFeed.length} events</span>
                </div>

                {/* Scrollable Threat Events */}
                <div ref={feedRef} className="flex-1 overflow-y-auto custom-scrollbar">
                    {threatFeed.map((ev) => {
                        const sev = SEV_CFG[ev.severity];
                        return (
                            <div key={ev.id}
                                className={clsx(
                                    "px-3 py-2 border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors",
                                    ev.severity === 'CRITICAL' && 'bg-rose-950/10'
                                )}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", sev.dot, ev.severity === 'CRITICAL' && 'animate-pulse')} />
                                    <span className={clsx("text-[8px] font-bold px-1 py-0.5 rounded border", sev.badge)}>{ev.severity}</span>
                                    {ev.technique && (
                                        <span className="text-[8px] bg-slate-900 border border-slate-700 text-slate-500 px-1 rounded font-bold">{ev.technique}</span>
                                    )}
                                    <span className="text-[8px] text-slate-700 ml-auto shrink-0">{ev.ts}</span>
                                </div>
                                <p className={clsx("text-[10px] leading-relaxed", sev.text)}>{ev.text}</p>
                                {ev.src_ip && (
                                    <p className="text-[8px] text-slate-700 mt-0.5">SRC: <span className="text-slate-500 font-mono">{ev.src_ip}</span></p>
                                )}
                                {ev.confidence > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <div className="h-0.5 flex-1 bg-slate-900 rounded-full overflow-hidden">
                                            <div className={clsx("h-full rounded-full transition-all", ev.confidence > 90 ? 'bg-rose-500' : ev.confidence > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                                                style={{ width: `${ev.confidence}%` }} />
                                        </div>
                                        <span className="text-[8px] text-slate-600">{ev.confidence}%</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {threatFeed.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-700 opacity-50 gap-2">
                            <BrainCircuit size={24} />
                            <p className="text-[10px] tracking-widest">Initializing neural engine...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── CENTER: Command Center (Tabbed Interface) ── */}
            <div className="col-span-6 h-full flex flex-col relative">
                <CommandCenter
                    selectedNode={selectedNode}
                    onNodeSelect={(node) => setSelectedNode(node)}
                    onDeepScan={(nodeId) => {
                        // Trigger deep_scan in intelligence tab
                        addThreat({
                            text: `Deep scan initiated on node ${nodeId}`,
                            severity: 'INFO',
                            confidence: 100
                        });
                    }}
                >
                    {/* Nested content for Battlefield tab */}
                    <div className="w-full h-full">
                        {viewMode === 'LOCAL' ? (
                            <GodsEyeGraph />
                        ) : (
                            <GlobalOpsMap
                                globeRef={globeRef}
                                graphData={{ nodes: [], links: [] }}
                                attackArcs={[]}
                                onNavigateToDevices={() => router.push('/devices')}
                            />
                        )}
                        
                        {/* Pulse scan overlay */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                            <div className="relative w-3 h-3">
                                <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
                                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                            </div>
                            <span className="text-[9px] text-cyan-600 tracking-widest">SCANNING</span>
                        </div>

                        {/* Asset recovery button */}
                        <button onClick={() => router.push('/devices')}
                            className="absolute top-3 right-3 z-20 bg-red-600/20 hover:bg-red-600/40 border border-red-700/50 text-red-500 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all flex items-center gap-1.5">
                            <Target size={11} />
                            ASSET RECOVERY
                        </button>

                        {/* View mode toggle - integrated into CommandCenter */}
                        <div className="absolute top-16 left-0 right-0 flex border-b border-slate-800/60 shrink-0 px-4">
                            <button onClick={() => setViewMode('LOCAL')}
                                className={clsx("flex-1 py-1.5 text-[9px] font-bold tracking-widest transition-colors flex items-center justify-center gap-1.5",
                                    viewMode === 'LOCAL' ? 'text-cyan-400 bg-cyan-950/20 border-b-2 border-cyan-500' : 'text-slate-600 hover:text-slate-400')}>
                                <Eye size={11} /> LOCAL AEGIS VAULT
                            </button>
                            <button onClick={() => setViewMode('GLOBAL')}
                                className={clsx("flex-1 py-1.5 text-[9px] font-bold tracking-widest transition-colors flex items-center justify-center gap-1.5",
                                    viewMode === 'GLOBAL' ? 'text-purple-400 bg-purple-950/20 border-b-2 border-purple-500' : 'text-slate-600 hover:text-slate-400')}>
                                <Globe size={11} /> GLOBAL OMNI-MAP
                            </button>
                        </div>
                    </div>
                </CommandCenter>
            </div>

            {/* ── RIGHT PANEL: Action Terminal ── */}
            <div className="col-span-3 h-full flex flex-col border-l border-slate-800/60">
                <ActionTerminal selectedNode={selectedNode} onExecuteAction={handleExecuteAction} />
            </div>
        </div>
    );
};
