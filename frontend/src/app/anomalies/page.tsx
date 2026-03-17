"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Activity, GitBranch, AlertTriangle, Eye, BrainCircuit, Zap,
    TrendingUp, Shield, ChevronRight, RefreshCw, Target, Radio,
    BarChart3, ArrowUpRight, Clock, Filter
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Anomaly {
    id: string;
    ts: string;
    source_ip: string;
    host?: string;
    anomaly_type: string;
    confidence_score: number;
    reasoning_tree: string[];
    status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
    mitre?: string;
    bytes_out?: number;
    auth_failures?: number;
    process?: string;
}

// ─── Anomaly Pool ────────────────────────────────────────────────────────────

const ANOMALY_POOL: Omit<Anomaly, 'id' | 'ts' | 'status'>[] = [
    {
        source_ip: '10.0.1.45', host: 'WORKSTN-089', anomaly_type: 'BEHAVIORAL_DEVIATION',
        confidence_score: 0.942, mitre: 'T1055', process: 'lsass.exe',
        reasoning_tree: ['process_access_rate: 85.0 (baseline: 12.0)', 'memory_read_bytes: 1.2GB (baseline: 0MB)', 'child_process_creation: 6 (baseline: 0)', 'endpoint_sensitivity: 1.0 (baseline: 0.1)'],
    },
    {
        source_ip: '45.33.22.11', anomaly_type: 'DATA_EXFILTRATION_RISK',
        confidence_score: 0.892, mitre: 'T1041', bytes_out: 2340000000,
        reasoning_tree: ['payload_size_mb: 2231.0 (baseline: 2.1)', 'dst_port: 443 (unusual upload volume)', 'session_duration: 4h32m (baseline: 12m)', 'data_entropy: HIGH (compressed/encrypted payload)'],
    },
    {
        source_ip: '192.168.1.105', anomaly_type: 'LOW_AND_SLOW_RECON',
        confidence_score: 0.812, mitre: 'T1046',
        reasoning_tree: ['port_scan_rate: 0.3 req/s (stealthy)', 'unique_dsts: 892 (baseline: 5)', 'SYN_without_ACK: 847 (half-open scan)', 'temporal_distribution: >6h window (evasion)'],
    },
    {
        source_ip: '10.0.1.22', anomaly_type: 'DNS_TUNNELING_C2',
        confidence_score: 0.978, mitre: 'T1071.004',
        reasoning_tree: ['dns_query_volume: 8420/hr (baseline: 120/hr)', 'query_entropy: 4.8 (baseline: 1.2 — randomized subdomains)', 'TXT_record_requests: 89% of queries (unusual)', 'external_domain: *.corp-internal-vpn.net (suspicious)'],
    },
    {
        source_ip: '10.0.0.15', host: 'DC-01', anomaly_type: 'CREDENTIAL_DUMPING',
        confidence_score: 0.964, mitre: 'T1003.001', auth_failures: 0, process: 'lsass.exe',
        reasoning_tree: ['lsass_memory_access: detected (Mimikatz IOC)', 'privilege_level: SYSTEM', 'ntds_dit_access: /Windows/NTDS/ntds.dit read', 'volume_shadow_copy: deletion attempted'],
    },
    {
        source_ip: '185.220.101.45', anomaly_type: 'EXTERNAL_THREAT_ACTOR',
        confidence_score: 0.998, mitre: 'T1078',
        reasoning_tree: ['geolocation: Tor exit node (AS60729)', 'threat_intel_match: Cobalt Strike C2 IOC database', 'honey_token_triggered: /backup/.env accessed', 'auth_attempt_rate: 1,240/min (credential stuffing)'],
    },
    {
        source_ip: '10.0.5.11', host: 'FILESERVER-01', anomaly_type: 'RANSOMWARE_PRE_DETONATION',
        confidence_score: 0.997, mitre: 'T1486', process: 'svchost.exe',
        reasoning_tree: ['vss_deletion_cmd: vssadmin delete shadows /all', 'file_rename_entropy: HIGH (bulk .locked extension)', 'backup_agent_killed: TRUE', 'registry_run_key: malware_svc.exe @startup'],
    },
    {
        source_ip: '10.0.2.33', host: 'WIN-SRV-04', anomaly_type: 'LATERAL_MOVEMENT',
        confidence_score: 0.841, mitre: 'T1021.002',
        reasoning_tree: ['smb_sessions_opened: 47 new (baseline: 3)', 'admin_share_access: ADMIN$, C$, IPC$', 'hash_used: NTLM pass-the-hash (no password)', 'targeted_hosts: DC-01, FILESERVER-01 (high-value)'],
    },
];

const TYPE_CFG: Record<string, { color: string; bg: string }> = {
    BEHAVIORAL_DEVIATION: { color: 'text-purple-400', bg: 'bg-purple-950/30' },
    DATA_EXFILTRATION_RISK: { color: 'text-red-400', bg: 'bg-red-950/20' },
    LOW_AND_SLOW_RECON: { color: 'text-amber-400', bg: 'bg-amber-950/20' },
    DNS_TUNNELING_C2: { color: 'text-cyan-400', bg: 'bg-cyan-950/20' },
    CREDENTIAL_DUMPING: { color: 'text-rose-400', bg: 'bg-rose-950/30' },
    EXTERNAL_THREAT_ACTOR: { color: 'text-orange-400', bg: 'bg-orange-950/20' },
    RANSOMWARE_PRE_DETONATION: { color: 'text-rose-500', bg: 'bg-rose-950/40' },
    LATERAL_MOVEMENT: { color: 'text-amber-500', bg: 'bg-amber-950/20' },
};

const STATUS_CFG = {
    ACTIVE: { color: 'text-rose-400', border: 'border-rose-700', bg: 'bg-rose-950/50' },
    INVESTIGATING: { color: 'text-amber-400', border: 'border-amber-700', bg: 'bg-amber-950/50' },
    RESOLVED: { color: 'text-emerald-400', border: 'border-emerald-700', bg: 'bg-emerald-950/50' },
    FALSE_POSITIVE: { color: 'text-slate-400', border: 'border-slate-700', bg: 'bg-slate-900' },
};

export default function AnomaliesPage() {
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [selected, setSelected] = useState<Anomaly | null>(null);
    const [filter, setFilter] = useState<'ALL' | Anomaly['status']>('ALL');
    const [stats, setStats] = useState({ total: 0, critical: 0, investigating: 0, avg_conf: 0 });

    const addAnomaly = useCallback((data: Omit<Anomaly, 'id' | 'ts' | 'status'>) => {
        const a: Anomaly = {
            ...data, id: `ANM-${Math.floor(9000 + Math.random() * 1000)}`,
            ts: new Date().toLocaleTimeString(), status: 'ACTIVE',
        };
        setAnomalies(prev => {
            const next = [a, ...prev].slice(0, 60);
            const active = next.filter(x => x.status === 'ACTIVE');
            setStats({
                total: next.length,
                critical: next.filter(x => x.confidence_score >= 0.9).length,
                investigating: next.filter(x => x.status === 'INVESTIGATING').length,
                avg_conf: active.length ? active.reduce((s, x) => s + x.confidence_score, 0) / active.length : 0,
            });
            return next;
        });
    }, []);

    // Boot with initial events + live stream
    useEffect(() => {
        ANOMALY_POOL.slice(0, 5).forEach((a, i) => setTimeout(() => addAnomaly(a), i * 600));
        const t = setInterval(() => {
            addAnomaly(ANOMALY_POOL[Math.floor(Math.random() * ANOMALY_POOL.length)]);
        }, Math.random() * 12000 + 8000);
        return () => clearInterval(t);
    }, [addAnomaly]);

    const updateStatus = (id: string, status: Anomaly['status']) => {
        setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
    };

    const getScoreBar = (score: number) => {
        const pct = Math.round(score * 100);
        const color = score >= 0.9 ? 'bg-rose-500' : score >= 0.8 ? 'bg-orange-500' : score >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500';
        return { pct, color };
    };

    const filtered = filter === 'ALL' ? anomalies : anomalies.filter(a => a.status === filter);

    return (
        <div className="flex flex-col h-screen bg-[#040406] text-slate-300 font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,rgba(80,0,120,0.08)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-purple-900/30 bg-black/60 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <Activity size={20} className="text-purple-400 animate-pulse" />
                    <div>
                        <h1 className="text-base font-bold text-purple-400 tracking-widest">ANOMALY DETECTION MATRIX — ISOLATION FOREST ENGINE</h1>
                        <p className="text-[9px] text-purple-900 tracking-widest">ML Behavioral Deviations · UEBA · Explainable AI Reasoning Tree · Live Threat Classification</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-950/30 border border-purple-800 rounded text-[10px] text-purple-400 font-bold">
                    <BrainCircuit size={12} className="animate-pulse" />
                    ISOLATION FOREST: ACTIVE
                </div>
            </header>

            {/* Stats bar */}
            <div className="relative z-10 grid grid-cols-4 border-b border-purple-900/20 bg-black/40 shrink-0">
                {[
                    { label: 'TOTAL ANOMALIES', value: stats.total, color: 'text-purple-400' },
                    { label: 'HIGH CONFIDENCE (>90%)', value: stats.critical, color: 'text-rose-400' },
                    { label: 'UNDER INVESTIGATION', value: stats.investigating, color: 'text-amber-400' },
                    { label: 'MEAN CONFIDENCE', value: `${(stats.avg_conf * 100).toFixed(1)}%`, color: 'text-emerald-400' },
                ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center py-3 border-r border-purple-900/20 last:border-r-0">
                        <span className={clsx("text-2xl font-bold", s.color)}>{s.value}</span>
                        <span className="text-[8px] text-slate-700 tracking-widest text-center">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Main layout */}
            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Anomaly Feed */}
                <div className="col-span-5 flex flex-col border-r border-purple-900/20 overflow-hidden">
                    {/* Filter */}
                    <div className="flex items-center gap-1 px-2 py-2 border-b border-purple-900/20 bg-black/40 shrink-0">
                        <Filter size={10} className="text-purple-500 mr-1" />
                        {(['ALL', 'ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={clsx("text-[8px] px-2 py-1 rounded border font-bold tracking-widest transition-all",
                                    filter === f
                                        ? f === 'ACTIVE' ? 'bg-rose-950 border-rose-600 text-rose-400'
                                            : f === 'INVESTIGATING' ? 'bg-amber-950 border-amber-600 text-amber-400'
                                                : f === 'RESOLVED' ? 'bg-emerald-950 border-emerald-600 text-emerald-400'
                                                    : 'bg-slate-800 border-slate-600 text-white'
                                        : 'border-slate-800 text-slate-600 hover:text-slate-400'
                                )}>{f === 'FALSE_POSITIVE' ? 'FALSE+' : f}</button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filtered.map(a => {
                            const ty = TYPE_CFG[a.anomaly_type] || { color: 'text-slate-400', bg: 'bg-slate-900' };
                            const st = STATUS_CFG[a.status];
                            const { pct, color: scoreColor } = getScoreBar(a.confidence_score);
                            return (
                                <div key={a.id} onClick={() => setSelected(a)}
                                    className={clsx(
                                        "px-3 py-2.5 border-b border-slate-900 cursor-pointer transition-colors hover:bg-slate-900/40",
                                        selected?.id === a.id && "bg-purple-950/20 border-l-2 border-l-purple-500",
                                        a.anomaly_type === 'RANSOMWARE_PRE_DETONATION' && a.status === 'ACTIVE' && 'bg-rose-950/10'
                                    )}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] text-slate-600 font-mono">{a.id}</span>
                                        {a.mitre && <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-500 px-1 rounded">{a.mitre}</span>}
                                        <span className={clsx("ml-auto text-[8px] px-1.5 py-0.5 rounded border font-bold", st.color, st.border, st.bg)}>{a.status}</span>
                                        <span className="text-[8px] text-slate-700">{a.ts}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xs font-bold text-white font-mono">{a.source_ip}</span>
                                        {a.host && <span className="text-[9px] text-slate-600">{a.host}</span>}
                                    </div>
                                    <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", ty.color, ty.bg)}>{a.anomaly_type.replace(/_/g, ' ')}</span>
                                    {/* Confidence bar */}
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="flex-1 h-0.5 bg-slate-900 rounded-full overflow-hidden">
                                            <div className={clsx("h-full rounded-full", scoreColor)} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[8px] text-slate-600 font-mono">{pct}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-800 gap-2">
                                <Activity size={24} />
                                <p className="text-[10px] tracking-widest">Monitor active — no anomalies in this class</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: XAI Reasoning Inspector */}
                <div className="col-span-7 flex flex-col overflow-hidden">
                    {selected ? (
                        <>
                            {/* Header */}
                            <div className={clsx("px-4 py-3 border-b flex items-center justify-between shrink-0 bg-black/60",
                                selected.anomaly_type === 'RANSOMWARE_PRE_DETONATION' ? 'border-rose-700' : 'border-purple-900/40')}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-bold text-slate-600 font-mono">{selected.id}</span>
                                        {selected.mitre && (
                                            <a href={`https://attack.mitre.org/techniques/${selected.mitre.replace('.', '/')}`}
                                                target="_blank" rel="noreferrer"
                                                className="text-[9px] text-cyan-500 hover:underline border border-cyan-800 px-1 rounded">
                                                {selected.mitre} ↗
                                            </a>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-black text-white font-mono">{selected.source_ip}</h2>
                                    {selected.host && <p className="text-xs text-slate-500">Host: {selected.host}</p>}
                                </div>
                                <div className="text-right space-y-1">
                                    <div className={clsx("text-sm font-black", (TYPE_CFG[selected.anomaly_type] || {}).color)}>
                                        {selected.anomaly_type.replace(/_/g, ' ')}
                                    </div>
                                    <div className="flex gap-1.5 justify-end">
                                        {(['INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'] as Anomaly['status'][]).map(s => (
                                            <button key={s} onClick={() => updateStatus(selected.id, s)}
                                                className={clsx("text-[8px] px-2 py-1 rounded border font-bold transition-all", STATUS_CFG[s].color, STATUS_CFG[s].border, 'hover:opacity-80')}>
                                                {s === 'FALSE_POSITIVE' ? 'FALSE+' : s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">

                                {/* Confidence gauge */}
                                <div className="bg-black/40 border border-slate-800 rounded p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-slate-600 font-bold tracking-widest">ML CONFIDENCE SCORE</span>
                                        <span className={clsx("text-2xl font-black font-mono",
                                            selected.confidence_score >= 0.9 ? 'text-rose-400' :
                                                selected.confidence_score >= 0.8 ? 'text-orange-400' : 'text-amber-400')}>
                                            {(selected.confidence_score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                        <div className={clsx("h-full rounded-full transition-all duration-1000", getScoreBar(selected.confidence_score).color)}
                                            style={{ width: `${getScoreBar(selected.confidence_score).pct}%` }} />
                                    </div>
                                    <div className="flex justify-between mt-1 text-[8px] text-slate-700">
                                        <span>LOW ANOMALY</span>
                                        <span>HIGH ANOMALY</span>
                                    </div>
                                </div>

                                {/* Explainable AI Reasoning Tree */}
                                <div>
                                    <h3 className="text-[10px] text-purple-500 font-bold tracking-widest flex items-center gap-2 mb-3">
                                        <GitBranch size={12} /> EXPLAINABLE AI — DEVIATION REASONING TREE
                                    </h3>
                                    <div className="space-y-2.5">
                                        {selected.reasoning_tree.map((reason, idx) => {
                                            const [metric, rest] = reason.split(': ');
                                            const [observed, baseline] = rest ? rest.split(' (baseline: ') : ['N/A', 'N/A)'];
                                            const baselineClean = baseline?.replace(')', '');
                                            return (
                                                <div key={idx} className="relative pl-4 border-l-2 border-purple-500/40">
                                                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-purple-500" />
                                                    <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold text-purple-300">{metric}</span>
                                                            <ChevronRight size={10} className="text-slate-600" />
                                                        </div>
                                                        <div className="flex gap-6">
                                                            <div>
                                                                <div className="text-[8px] text-slate-600 tracking-widest mb-0.5">OBSERVED</div>
                                                                <div className="text-sm font-bold text-rose-400 font-mono">{observed}</div>
                                                            </div>
                                                            {baselineClean && (
                                                                <div>
                                                                    <div className="text-[8px] text-slate-600 tracking-widest mb-0.5">BASELINE</div>
                                                                    <div className="text-sm font-bold text-emerald-600 font-mono">{baselineClean}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Quick metadata */}
                                {(selected.bytes_out || selected.auth_failures !== undefined || selected.process) && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {selected.bytes_out && (
                                            <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                <div className="text-[8px] text-slate-600 tracking-widest">DATA OUT</div>
                                                <div className="text-sm font-bold text-rose-400">{(selected.bytes_out / 1e9).toFixed(1)} GB</div>
                                            </div>
                                        )}
                                        {selected.auth_failures !== undefined && (
                                            <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                <div className="text-[8px] text-slate-600 tracking-widest">AUTH FAILURES</div>
                                                <div className="text-sm font-bold text-orange-400">{selected.auth_failures}</div>
                                            </div>
                                        )}
                                        {selected.process && (
                                            <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                <div className="text-[8px] text-slate-600 tracking-widest">PROCESS</div>
                                                <div className="text-sm font-bold text-amber-400 font-mono">{selected.process}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="flex items-center justify-center gap-2 py-2.5 rounded border border-purple-700 text-purple-400 text-xs font-bold hover:bg-purple-950/30 transition-all">
                                        <Eye size={13} /> DEEP DIVE INVESTIGATION
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-2.5 rounded border border-rose-700 text-rose-400 text-xs font-bold hover:bg-rose-950/30 transition-all">
                                        <Shield size={13} /> ISOLATE HOST
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-3">
                            <BrainCircuit size={32} />
                            <p className="text-xs tracking-widest">Select an anomaly to view the XAI reasoning tree</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
