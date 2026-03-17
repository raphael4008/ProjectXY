"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Skull, TerminalSquare, Zap, Crosshair, ChevronRight, PlayCircle,
    Shield, Target, GitBranch, Activity, AlertTriangle, CheckCircle2,
    Clock, Cpu, Network, Database, Lock, Unlock, Eye, Radio
} from 'lucide-react';
import { clsx } from 'clsx';

// MITRE ATT&CK Framework Kill-Chain Phases
const KILL_CHAIN_PHASES = [
    { id: 'recon', label: 'RECONNAISSANCE', icon: Eye, color: 'slate' },
    { id: 'resource', label: 'RESOURCE DEV', icon: Database, color: 'blue' },
    { id: 'initial', label: 'INITIAL ACCESS', icon: Unlock, color: 'amber' },
    { id: 'execution', label: 'EXECUTION', icon: Cpu, color: 'orange' },
    { id: 'persist', label: 'PERSISTENCE', icon: Lock, color: 'red' },
    { id: 'escalate', label: 'PRIV ESCALATION', icon: AlertTriangle, color: 'rose' },
    { id: 'lateral', label: 'LATERAL MOVEMENT', icon: Network, color: 'purple' },
    { id: 'exfil', label: 'EXFILTRATION', icon: Radio, color: 'fuchsia' },
];

interface AttackLog {
    id: string;
    timestamp: string;
    phase: string;
    phase_color: string;
    text: string;
    type: 'info' | 'success' | 'warning' | 'critical' | 'separator';
    technique?: string;
}

interface Metric {
    label: string;
    value: string | number;
    color: string;
}

const SCENARIOS = [
    {
        id: 'apt_phantom',
        name: 'APT-41: PHANTOM PROTOCOL',
        type: 'Nation-State APT Emulation',
        target: 'Enterprise Internal Subnet (192.168.0.0/24)',
        difficulty: 'EXTREME',
        ttps: ['T1595', 'T1190', 'T1059', 'T1078', 'T1021', 'T1041'],
        description: 'Emulates a sophisticated nation-state actor using living-off-the-land binaries, memory-only payloads, and encrypted C2 over HTTPS.',
        threat_actor: 'APT-41 (Winnti Group)',
        estimated_dwell_time: '72h',
    },
    {
        id: 'ransomware_eclipse',
        name: 'OPERATION ECLIPSE (Ransomware)',
        type: 'Ransomware Double-Extortion',
        target: 'Database Cluster (10.0.5.0/28)',
        difficulty: 'HARD',
        ttps: ['T1133', 'T1486', 'T1490', 'T1489', 'T1567'],
        description: 'Full ransomware kill-chain simulation from initial phishing to data encryption and backup destruction.',
        threat_actor: 'LockBit 3.0 TTP Clone',
        estimated_dwell_time: '48h',
    },
    {
        id: 'insider_threat',
        name: 'OPERATION SILENT MOLE',
        type: 'Insider Threat / Supply Chain',
        target: 'CI/CD Pipeline (GitHub Actions + ECR)',
        difficulty: 'HARD',
        ttps: ['T1195', 'T1176', 'T1525', 'T1552', 'T1098'],
        description: 'Simulates a compromised developer credential used to poison the software supply chain and inject a backdoor into production containers.',
        threat_actor: 'Insider + TA423',
        estimated_dwell_time: '14d',
    },
    {
        id: 'zero_day_storm',
        name: 'ZERO-DAY STORM',
        type: 'Zero-Day RCE + C2 Infrastructure',
        target: 'Edge Gateway + OT Network Bridge',
        difficulty: 'EXTREME',
        ttps: ['T1190', 'T1059.004', 'T1572', 'T1071.004', 'T1018'],
        description: 'Exploits an unpatched vulnerability in the edge gateway to pivot into the OT network. Uses DNS-over-HTTPS C2 to evade detection.',
        threat_actor: 'Sandworm (Unit 74455)',
        estimated_dwell_time: '96h',
    },
];

function getLogStyle(type: AttackLog['type']): string {
    switch (type) {
        case 'critical': return 'text-rose-400 font-bold';
        case 'success': return 'text-emerald-400';
        case 'warning': return 'text-amber-400';
        case 'separator': return 'text-red-600 font-bold tracking-widest mt-2 mb-1 border-t border-red-900/40 pt-2';
        default: return 'text-slate-300';
    }
}

export default function RedTeamPage() {
    const [selectedScenario, setSelectedScenario] = useState<any>(SCENARIOS[0]);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<AttackLog[]>([]);
    const [activePhaseIdx, setActivePhaseIdx] = useState(-1);
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [objectives, setObjectives] = useState<{ label: string; status: 'pending' | 'done' | 'active' }[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const wsUrl = API_BASE.replace('http', 'ws') + '/ws/redteam';
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => setWsConnected(true);
        socket.onclose = () => setWsConnected(false);
        socket.onerror = () => setWsConnected(false);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.log === '[TERMINATE]') {
                    setIsRunning(false);
                    return;
                }
                if (data.phase_idx !== undefined) {
                    setActivePhaseIdx(data.phase_idx);
                }
                if (data.metrics) {
                    setMetrics(data.metrics);
                }
                if (data.objective) {
                    setObjectives(prev => {
                        const updated = [...prev];
                        const idx = updated.findIndex(o => o.label === data.objective.label);
                        if (idx > -1) updated[idx] = data.objective;
                        return updated;
                    });
                }
                if (data.log) {
                    setLogs(prev => [...prev, {
                        id: `${Date.now()}-${Math.random()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        phase: data.phase || '',
                        phase_color: data.phase_color || 'slate',
                        text: data.log,
                        type: data.type || 'info',
                        technique: data.technique,
                    }]);
                }
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };

        setWs(socket);
        return () => { if (socket.readyState === WebSocket.OPEN) socket.close(); };
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleLaunch = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            setLogs([{ id: 'err', timestamp: new Date().toLocaleTimeString(), phase: '', phase_color: 'slate', text: '[ERROR] C2 Link offline. Backend WebSocket not connected.', type: 'critical' }]);
            return;
        }
        setIsRunning(true);
        setLogs([]);
        setActivePhaseIdx(0);
        setMetrics([]);

        // Initialize objectives from scenario TTPs
        setObjectives([
            { label: 'Establish Foothold', status: 'active' },
            { label: 'Bypass EDR Detection', status: 'pending' },
            { label: 'Escalate Privileges', status: 'pending' },
            { label: 'Move Laterally', status: 'pending' },
            { label: 'Reach Crown Jewels', status: 'pending' },
            { label: 'Exfiltrate Payload', status: 'pending' },
        ]);

        ws.send(JSON.stringify({ action: 'launch', scenario: selectedScenario }));
    }, [ws, selectedScenario]);

    const handleAbort = () => {
        setIsRunning(false);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'abort' }));
        }
        setLogs(prev => [...prev, {
            id: 'abort', timestamp: new Date().toLocaleTimeString(), phase: 'SYS', phase_color: 'red',
            text: '[!] OPERATOR ABORT — Exercise terminated by SOC override.', type: 'critical'
        }]);
    };

    return (
        <div className="flex flex-col h-screen bg-[#030303] text-white overflow-hidden font-mono">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,0,0,0.15)_0,transparent_70%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.10)_50%)] bg-[length:100%_4px] opacity-20" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-red-900/40 bg-black/60 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Skull size={22} className={clsx("text-red-500", isRunning && "animate-pulse")} />
                        <div>
                            <h1 className="text-lg font-bold text-red-500 tracking-widest">NEMESIS — RED TEAM COMBAT ARENA</h1>
                            <p className="text-[10px] text-red-900 uppercase tracking-widest">MITRE ATT&CK TTPs · Autonomous Adversary Emulation · AI-Driven Kill-Chain</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* WS Status */}
                    <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-bold tracking-widest", wsConnected ? "border-emerald-800 text-emerald-400 bg-emerald-950/30" : "border-red-900 text-red-500 bg-red-950/20")}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full", wsConnected ? "bg-emerald-500 animate-pulse" : "bg-red-600")} />
                        {wsConnected ? 'C2 UPLINK ACTIVE' : 'C2 OFFLINE'}
                    </div>
                    {isRunning && (
                        <button onClick={handleAbort} className="flex items-center gap-2 px-4 py-1.5 bg-red-950/60 border border-red-500 text-red-400 text-xs font-bold rounded hover:bg-red-900/60 transition-colors animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            ABORT MISSION
                        </button>
                    )}
                </div>
            </header>

            {/* MITRE ATT&CK Kill-Chain Progress Bar */}
            <div className="relative z-10 flex items-stretch border-b border-red-900/20 bg-black/40 shrink-0">
                {KILL_CHAIN_PHASES.map((phase, i) => {
                    const Icon = phase.icon;
                    const isActive = i === activePhaseIdx;
                    const isPast = i < activePhaseIdx;
                    return (
                        <div key={phase.id} className={clsx(
                            "flex-1 flex flex-col items-center justify-center py-2 px-1 border-r border-red-900/20 transition-all duration-500 gap-1 relative overflow-hidden",
                            isActive ? "bg-red-950/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]" : isPast ? "bg-slate-900/30" : "opacity-30"
                        )}>
                            {isActive && <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(239,68,68,0.08),transparent)] animate-[scan_2s_linear_infinite]" />}
                            <Icon size={12} className={clsx(isActive ? "text-red-400" : isPast ? "text-slate-500" : "text-slate-700")} />
                            <span className={clsx("text-[8px] font-bold tracking-widest text-center", isActive ? "text-red-400" : isPast ? "text-slate-500" : "text-slate-700")}>
                                {phase.label}
                            </span>
                            {isPast && <CheckCircle2 size={9} className="text-emerald-600 absolute top-1 right-1" />}
                            {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />}
                        </div>
                    );
                })}
            </div>

            {/* Main Body */}
            <div className="flex-1 grid grid-cols-12 gap-0 relative z-10 min-h-0">

                {/* LEFT: Scenario Panel */}
                <div className="col-span-3 border-r border-red-900/20 flex flex-col bg-black/30 overflow-hidden">
                    <div className="p-3 border-b border-red-900/30 bg-black/50 flex items-center gap-2 shrink-0">
                        <Crosshair size={13} className="text-red-500" />
                        <span className="text-[10px] font-bold text-red-500 tracking-widest">OPERATION PROTOCOLS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {SCENARIOS.map(s => (
                            <div key={s.id} onClick={() => !isRunning && setSelectedScenario(s)}
                                className={clsx(
                                    "p-3 border rounded cursor-pointer transition-all text-left",
                                    selectedScenario.id === s.id ? "bg-red-950/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "bg-black/40 border-red-900/20 hover:border-red-800/50",
                                    isRunning && "cursor-not-allowed opacity-40"
                                )}>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={clsx("text-[10px] font-bold tracking-wide leading-tight", selectedScenario.id === s.id ? "text-red-400" : "text-slate-300")}>
                                        {s.name}
                                    </h3>
                                    <span className={clsx("text-[8px] px-1.5 py-0.5 rounded border font-bold shrink-0 ml-1",
                                        s.difficulty === 'EXTREME' ? "border-purple-600 text-purple-400 bg-purple-950/30" : "border-red-600 text-red-400 bg-red-950/30"
                                    )}>{s.difficulty}</span>
                                </div>
                                <p className="text-[9px] text-slate-500 mb-2 leading-relaxed">{s.description}</p>
                                <div className="space-y-1">
                                    <p className="text-[9px] text-slate-600"><span className="text-red-800">TARGET:</span> {s.target}</p>
                                    <p className="text-[9px] text-slate-600"><span className="text-red-800">ACTOR:</span> {s.threat_actor}</p>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {s.ttps.slice(0, 4).map(t => (
                                        <span key={t} className="text-[8px] bg-slate-900 border border-slate-700 text-slate-500 px-1 rounded">{t}</span>
                                    ))}
                                    {s.ttps.length > 4 && <span className="text-[8px] text-slate-600">+{s.ttps.length - 4} more</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Launch Button */}
                    <div className="p-3 border-t border-red-900/30 bg-black/60 shrink-0">
                        <button onClick={isRunning ? handleAbort : handleLaunch}
                            className={clsx(
                                "w-full font-bold py-3 rounded tracking-widest uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-lg",
                                isRunning
                                    ? "bg-red-950/60 border border-red-600 text-red-400 hover:bg-red-900/60 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                    : "bg-red-900/40 hover:bg-red-600 border border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                            )}>
                            {isRunning ? (
                                <><span className="w-3 h-3 rounded-full bg-red-500 animate-ping" /> EXECUTING — ABORT</>
                            ) : (
                                <><PlayCircle size={16} /> LAUNCH OPERATION</>
                            )}
                        </button>
                    </div>
                </div>

                {/* CENTER: Combat Telemetry Stream */}
                <div className="col-span-6 flex flex-col border-r border-red-900/20 overflow-hidden">
                    <div className="p-3 border-b border-red-900/30 bg-black/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <TerminalSquare size={13} className="text-red-500" />
                            <span className="text-[10px] font-bold text-red-400 tracking-widest">NEMESIS AI — LIVE TELEMETRY</span>
                        </div>
                        {isRunning && (
                            <div className="flex items-center gap-2 text-[9px] text-red-500 font-bold">
                                <Activity size={11} className="animate-pulse" />
                                <span className="animate-pulse">LIVE FIRE</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-0.5">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 space-y-3 opacity-60">
                                <TerminalSquare size={36} />
                                <p className="text-xs uppercase tracking-widest">Select an operation and deploy</p>
                                <p className="text-[10px] text-slate-800">NEMESIS AI will stream live TTPs and kill-chain events</p>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className={clsx("flex gap-2 items-start leading-relaxed", getLogStyle(log.type))}>
                                    <span className="text-[9px] text-red-900/70 shrink-0 mt-0.5 select-none">[{log.timestamp}]</span>
                                    {log.technique && (
                                        <span className="text-[8px] bg-red-950/40 border border-red-900/40 text-red-700 px-1 rounded shrink-0 mt-0.5 font-bold">{log.technique}</span>
                                    )}
                                    <span className="break-words">{log.text}</span>
                                </div>
                            ))
                        )}
                        {isRunning && (
                            <div className="flex gap-2 text-red-600 mt-2 animate-pulse">
                                <ChevronRight size={12} className="mt-0.5" />
                                <span>_</span>
                            </div>
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* RIGHT: Mission Status Panel */}
                <div className="col-span-3 flex flex-col bg-black/30 overflow-hidden">
                    {/* Objectives */}
                    <div className="border-b border-red-900/20">
                        <div className="p-3 border-b border-red-900/20 flex items-center gap-2">
                            <Target size={12} className="text-red-500" />
                            <span className="text-[10px] font-bold text-red-500 tracking-widest">MISSION OBJECTIVES</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                            {objectives.length === 0 ? (
                                <p className="text-[10px] text-slate-700 text-center py-4">Launch operation to initialize objectives</p>
                            ) : objectives.map((obj, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0",
                                        obj.status === 'done' ? 'bg-emerald-500' :
                                            obj.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'
                                    )} />
                                    <span className={clsx("text-[10px]",
                                        obj.status === 'done' ? 'text-emerald-400 line-through' :
                                            obj.status === 'active' ? 'text-red-400 font-bold' : 'text-slate-600'
                                    )}>{obj.label}</span>
                                    {obj.status === 'done' && <CheckCircle2 size={10} className="text-emerald-600 ml-auto" />}
                                    {obj.status === 'active' && <Activity size={10} className="text-red-500 animate-pulse ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Metrics */}
                    <div className="border-b border-red-900/20">
                        <div className="p-3 border-b border-red-900/20 flex items-center gap-2">
                            <Activity size={12} className="text-red-500" />
                            <span className="text-[10px] font-bold text-red-500 tracking-widest">COMBAT METRICS</span>
                        </div>
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {metrics.length === 0 ? (
                                <p className="col-span-2 text-[10px] text-slate-700 text-center py-3">Awaiting engagement...</p>
                            ) : metrics.map((m, i) => (
                                <div key={i} className="bg-black/60 border border-slate-800 rounded p-2">
                                    <p className="text-[9px] text-slate-600 uppercase tracking-wide mb-0.5">{m.label}</p>
                                    <p className={clsx("text-sm font-bold font-mono", m.color || 'text-white')}>{m.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected Scenario Details */}
                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                        <div className="p-3 bg-black/60 border border-red-900/20 rounded space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <GitBranch size={12} className="text-red-500" />
                                <span className="text-[10px] font-bold text-red-500 tracking-widest">OPERATION BRIEF</span>
                            </div>
                            <div className="space-y-1.5 text-[10px]">
                                <div><span className="text-slate-600">ACTOR:</span> <span className="text-red-400 font-bold">{selectedScenario.threat_actor}</span></div>
                                <div><span className="text-slate-600">TYPE:</span> <span className="text-slate-300">{selectedScenario.type}</span></div>
                                <div><span className="text-slate-600">AVG DWELL:</span> <span className="text-amber-400 font-bold">{selectedScenario.estimated_dwell_time}</span></div>
                            </div>
                            <div className="pt-2 border-t border-slate-800">
                                <p className="text-[9px] text-slate-600 mb-1.5">MITRE ATT&CK TTPs</p>
                                <div className="flex flex-wrap gap-1">
                                    {selectedScenario.ttps.map((t: string) => (
                                        <span key={t} className="text-[8px] bg-red-950/30 border border-red-900/40 text-red-600 px-1.5 py-0.5 rounded font-bold">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
