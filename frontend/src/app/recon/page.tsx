"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Radar, Terminal, Play, Square, Zap, Server, Database, Globe,
    Wifi, AlertTriangle, CheckCircle2, Circle, Network, Search,
    Shield, Activity, Eye, ChevronRight, Lock, Unlock
} from 'lucide-react';
import { clsx } from 'clsx';

interface DiscoveredHost {
    ip: string;
    open_ports: number[];
    services: Record<string, string>;
    status: 'up' | 'down';
    risk?: 'critical' | 'high' | 'medium' | 'low';
}

interface ScanLog {
    id: string;
    ts: string;
    text: string;
    type: 'info' | 'success' | 'warning' | 'critical' | 'system';
}

function getRisk(ports: number[]): 'critical' | 'high' | 'medium' | 'low' {
    const critical = [22, 23, 3389, 5900, 445, 1433, 1521, 27017];
    const high = [21, 3306, 5432, 6379, 9200];
    if (ports.some(p => critical.includes(p))) return 'critical';
    if (ports.some(p => high.includes(p))) return 'high';
    if (ports.length > 5) return 'medium';
    return 'low';
}

function getServiceIcon(port: number) {
    if ([80, 443, 8080, 8443].includes(port)) return Globe;
    if ([22, 23].includes(port)) return Terminal;
    if ([3306, 5432, 1433, 27017, 9200, 6379].includes(port)) return Database;
    if ([445, 139, 135].includes(port)) return Network;
    if ([3389, 5900].includes(port)) return Eye;
    return Server;
}

const PORT_NAMES: Record<number, string> = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP',
    443: 'HTTPS', 445: 'SMB', 1433: 'MSSQL', 1521: 'Oracle',
    3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC',
    6379: 'Redis', 7474: 'Neo4j-HTTP', 7687: 'Neo4j-Bolt', 8000: 'HTTP-Alt',
    8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt', 9200: 'Elasticsearch', 27017: 'MongoDB',
};

const RISK_COLORS = {
    critical: { border: 'border-rose-500', bg: 'bg-rose-950/30', text: 'text-rose-400', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]', dot: 'bg-rose-500' },
    high: { border: 'border-orange-500', bg: 'bg-orange-950/20', text: 'text-orange-400', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]', dot: 'bg-orange-500' },
    medium: { border: 'border-amber-600', bg: 'bg-amber-950/20', text: 'text-amber-400', glow: '', dot: 'bg-amber-500' },
    low: { border: 'border-slate-700', bg: 'bg-slate-900/30', text: 'text-slate-400', glow: '', dot: 'bg-slate-500' },
};

export default function OmniProbePage() {
    const [target, setTarget] = useState('10.0.0.0/24');
    const [scanType, setScanType] = useState('FULL_SPECTRUM');
    const [hosts, setHosts] = useState<DiscoveredHost[]>([]);
    const [logs, setLogs] = useState<ScanLog[]>([]);
    const [scanning, setScanning] = useState(false);
    const [selectedHost, setSelectedHost] = useState<DiscoveredHost | null>(null);
    const [stats, setStats] = useState({ scanned: 0, alive: 0, ports: 0, criticals: 0 });
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const logsRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    const addLog = useCallback((text: string, type: ScanLog['type'] = 'info') => {
        setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), text, type }]);
    }, []);

    useEffect(() => {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const wsUrl = API_BASE.replace('http', 'ws') + '/ws/omniprobe';
        const socket = new WebSocket(wsUrl);
        socket.onopen = () => { setWsConnected(true); };
        socket.onclose = () => setWsConnected(false);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'status') {
                    addLog(data.message, 'system');
                } else if (data.type === 'host') {
                    const host: DiscoveredHost = { ...data.host, risk: getRisk(data.host.open_ports) };
                    setHosts(prev => [...prev, host]);
                    addLog(`[+] HOST UP: ${host.ip} | Ports: ${host.open_ports.join(', ')} | Risk: ${host.risk?.toUpperCase()}`,
                        host.risk === 'critical' ? 'critical' : 'success');
                    setStats(prev => ({
                        scanned: prev.scanned + 1,
                        alive: prev.alive + 1,
                        ports: prev.ports + host.open_ports.length,
                        criticals: prev.criticals + (host.risk === 'critical' ? 1 : 0),
                    }));
                } else if (data.type === 'complete') {
                    setScanning(false);
                    setProgress(100);
                    addLog(`[✓] SCAN COMPLETE — ${data.total_scanned} hosts probed, ${data.total_alive} alive.`, 'success');
                }
            } catch (e) { console.error(e); }
        };

        setWs(socket);
        return () => { if (socket.readyState === WebSocket.OPEN) socket.close(); };
    }, [addLog]);

    useEffect(() => {
        logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
    }, [logs]);

    // Simulate progress bar during scan
    useEffect(() => {
        if (!scanning) return;
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 92) { clearInterval(interval); return prev; }
                return prev + Math.random() * 3;
            });
        }, 500);
        return () => clearInterval(interval);
    }, [scanning]);

    const handleScan = useCallback(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            addLog('[ERROR] Omni-Probe uplink offline. Check backend connection.', 'critical');
            return;
        }
        setHosts([]);
        setLogs([]);
        setSelectedHost(null);
        setStats({ scanned: 0, alive: 0, ports: 0, criticals: 0 });
        setScanning(true);
        setProgress(0);
        addLog(`[OMNI-PROBE] Initializing ${scanType} reconnaissance against ${target}...`, 'system');
        ws.send(JSON.stringify({ action: 'scan', target, scan_type: scanType }));
    }, [ws, target, scanType, addLog]);

    const handleStop = useCallback(() => {
        setScanning(false);
        addLog('[!] Scan aborted by operator.', 'warning');
    }, [addLog]);

    const risk = selectedHost?.risk || 'low';
    const rc = RISK_COLORS[risk];

    return (
        <div className="flex flex-col h-screen bg-[#030508] text-white overflow-hidden font-mono">
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(0,60,100,0.12)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-black/60 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <Radar size={20} className={clsx("text-cyan-400", scanning && "animate-spin")} style={scanning ? { animationDuration: '3s' } : {}} />
                    <div>
                        <h1 className="text-base font-bold text-cyan-400 tracking-widest">OMNI-PROBE — ABSOLUTE RECONNAISSANCE</h1>
                        <p className="text-[9px] text-cyan-900 tracking-widest">Hyper-concurrent TCP scanning · Banner extraction · Risk classification · Live topology</p>
                    </div>
                </div>
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-bold",
                    wsConnected ? "border-cyan-800 text-cyan-400 bg-cyan-950/20" : "border-slate-700 text-slate-500 bg-slate-900/30"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", wsConnected ? "bg-cyan-400 animate-pulse" : "bg-slate-600")} />
                    {wsConnected ? 'PROBE UPLINK ACTIVE' : 'UPLINK OFFLINE'}
                </div>
            </header>

            {/* Stats Bar */}
            <div className="relative z-10 grid grid-cols-4 border-b border-cyan-900/20 bg-black/40 shrink-0">
                {[
                    { label: 'HOSTS ALIVE', value: stats.alive, color: 'text-cyan-400' },
                    { label: 'OPEN PORTS', value: stats.ports, color: 'text-emerald-400' },
                    { label: 'CRITICAL RISKS', value: stats.criticals, color: 'text-rose-400' },
                    { label: 'PROGRESS', value: `${Math.round(progress)}%`, color: 'text-amber-400' },
                ].map(s => (
                    <div key={s.label} className="flex flex-col items-center py-3 border-r border-cyan-900/20 last:border-r-0">
                        <span className={clsx("text-2xl font-bold font-mono", s.color)}>{s.value}</span>
                        <span className="text-[9px] text-slate-600 tracking-widest">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Progress bar */}
            {scanning && (
                <div className="h-0.5 bg-slate-900 relative z-10 shrink-0">
                    <div className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ width: `${progress}%` }} />
                </div>
            )}

            {/* Main layout */}
            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Controls + Topology Grid */}
                <div className="col-span-3 flex flex-col border-r border-cyan-900/20 overflow-hidden">
                    {/* Scan Controls */}
                    <div className="p-4 border-b border-cyan-900/20 bg-black/40 space-y-3 shrink-0">
                        <div>
                            <label className="text-[9px] text-slate-600 tracking-widest block mb-1">TARGET (IP / CIDR)</label>
                            <input
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                disabled={scanning}
                                className="w-full bg-black/60 border border-cyan-900/40 text-cyan-400 text-xs px-3 py-2 rounded outline-none focus:border-cyan-500/60 transition-colors disabled:opacity-40 font-mono placeholder-slate-700"
                                placeholder="10.0.0.0/24 or 192.168.1.1"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] text-slate-600 tracking-widest block mb-1">SCAN MODE</label>
                            <select
                                value={scanType}
                                onChange={e => setScanType(e.target.value)}
                                disabled={scanning}
                                className="w-full bg-black/60 border border-cyan-900/40 text-cyan-400 text-xs px-3 py-2 rounded outline-none focus:border-cyan-500/60 disabled:opacity-40"
                            >
                                <option value="FULL_SPECTRUM">FULL SPECTRUM (Top 30 Ports)</option>
                                <option value="AGGRESSIVE">AGGRESSIVE (Top 1000 Ports)</option>
                                <option value="STEALTH">STEALTH (SYN-Scan, Low TTL)</option>
                                <option value="DATABASE">DATABASE-ONLY (DB Ports)</option>
                            </select>
                        </div>
                        <button
                            onClick={scanning ? handleStop : handleScan}
                            className={clsx(
                                "w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold text-xs tracking-widest transition-all",
                                scanning
                                    ? "bg-rose-950/50 border border-rose-600 text-rose-400 hover:bg-rose-900/50"
                                    : "bg-cyan-900/30 border border-cyan-600/50 text-cyan-400 hover:bg-cyan-800/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                            )}>
                            {scanning ? <><Square size={13} /> ABORT SCAN</> : <><Play size={13} /> LAUNCH PROBE</>}
                        </button>
                    </div>

                    {/* Discovered Host List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                        {hosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 opacity-50 gap-2">
                                <Radar size={28} />
                                <p className="text-[10px] uppercase tracking-widest">No hosts discovered yet</p>
                            </div>
                        ) : hosts.map(host => {
                            const r = RISK_COLORS[host.risk || 'low'];
                            return (
                                <button
                                    key={host.ip}
                                    onClick={() => setSelectedHost(host)}
                                    className={clsx(
                                        "w-full text-left p-2.5 rounded border transition-all",
                                        r.border, r.bg,
                                        selectedHost?.ip === host.ip ? `${r.glow} ring-1 ring-inset ${r.border}` : 'hover:opacity-90'
                                    )}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={clsx("text-xs font-bold font-mono", r.text)}>{host.ip}</span>
                                        <span className={clsx("text-[8px] rounded px-1 font-bold", r.text, r.bg)}>{host.risk?.toUpperCase()}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {host.open_ports.slice(0, 6).map(p => (
                                            <span key={p} className="text-[8px] bg-black/40 border border-slate-800 text-slate-500 px-1 rounded">{PORT_NAMES[p] || p}</span>
                                        ))}
                                        {host.open_ports.length > 6 && <span className="text-[8px] text-slate-600">+{host.open_ports.length - 6}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER: Live Network Topology (dot grid) */}
                <div className="col-span-5 flex flex-col border-r border-cyan-900/20 overflow-hidden">
                    <div className="p-3 border-b border-cyan-900/20 bg-black/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Network size={13} className="text-cyan-400" />
                            <span className="text-[10px] font-bold text-cyan-400 tracking-widest">LIVE NETWORK TOPOLOGY</span>
                        </div>
                        <span className="text-[9px] text-slate-600">{hosts.length} hosts mapped</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {hosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-800 gap-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border border-cyan-900/30 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full border border-cyan-900/20 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full border border-cyan-900/10 flex items-center justify-center">
                                                <Radar size={14} className="text-cyan-900" />
                                            </div>
                                        </div>
                                    </div>
                                    {scanning && (
                                        <>
                                            <div className="absolute inset-0 rounded-full border border-cyan-700/20 animate-ping" />
                                            <div className="absolute inset-0 rounded-full border border-cyan-600/10 animate-ping" style={{ animationDelay: '0.5s' }} />
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] tracking-widest text-slate-700">
                                    {scanning ? 'SCANNING NETWORK...' : 'No topology data — launch a scan'}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3 content-start">
                                {/* Gateway node */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-14 h-14 rounded-full border-2 border-cyan-500/50 bg-cyan-950/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                        <Wifi size={20} className="text-cyan-400" />
                                    </div>
                                    <span className="text-[8px] text-cyan-600">GATEWAY</span>
                                </div>
                                {/* Host nodes */}
                                {hosts.map(host => {
                                    const r = RISK_COLORS[host.risk || 'low'];
                                    const Icon = getServiceIcon(host.open_ports[0] || 0);
                                    return (
                                        <button
                                            key={host.ip}
                                            onClick={() => setSelectedHost(host)}
                                            className="flex flex-col items-center gap-1.5 group"
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all",
                                                r.border, r.bg,
                                                selectedHost?.ip === host.ip ? r.glow + ' scale-110' : 'group-hover:scale-105',
                                            )}>
                                                <Icon size={16} className={r.text} />
                                            </div>
                                            <span className={clsx("text-[8px] font-mono", r.text)}>{host.ip.split('.').slice(-2).join('.')}</span>
                                            <div className="flex gap-0.5">
                                                {host.open_ports.slice(0, 4).map(p => (
                                                    <div key={p} className={clsx("w-1 h-1 rounded-full", r.dot)} title={PORT_NAMES[p] || String(p)} />
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Host Inspector + Logs */}
                <div className="col-span-4 flex flex-col overflow-hidden">
                    {/* Host Inspector */}
                    {selectedHost ? (
                        <div className="border-b border-cyan-900/20 shrink-0">
                            <div className={clsx("p-3 border-b", rc.border, "flex items-center justify-between bg-black/60")}>
                                <div className="flex items-center gap-2">
                                    <span className={clsx("w-2 h-2 rounded-full", rc.dot)} />
                                    <span className={clsx("text-sm font-bold font-mono", rc.text)}>{selectedHost.ip}</span>
                                </div>
                                <span className={clsx("text-[9px] px-2 py-1 rounded border font-bold", rc.border, rc.text, rc.bg)}>
                                    {selectedHost.risk?.toUpperCase()} RISK
                                </span>
                            </div>
                            <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                                <p className="text-[9px] text-slate-600 mb-2 tracking-widest">EXPOSED SERVICES</p>
                                {selectedHost.open_ports.map(port => (
                                    <div key={port} className="flex items-center justify-between py-1 border-b border-slate-900">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 font-mono w-8">{port}</span>
                                            <span className="text-[10px] text-cyan-500">{PORT_NAMES[port] || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[22, 23, 3389, 5900].includes(port) && <AlertTriangle size={9} className="text-rose-500" />}
                                            {[80, 443].includes(port) && <Globe size={9} className="text-cyan-600" />}
                                            <span className="text-[8px] text-slate-600 max-w-[120px] truncate">
                                                {selectedHost.services[port] || 'Open'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="border-b border-cyan-900/20 p-6 flex flex-col items-center justify-center text-slate-700 gap-2 shrink-0">
                            <Search size={20} />
                            <p className="text-[10px] tracking-widest text-center">Click a host to inspect exposed services and risk profile</p>
                        </div>
                    )}

                    {/* Scan Log Terminal */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-cyan-900/20 bg-black/40 flex items-center gap-2 shrink-0">
                            <Activity size={12} className={clsx("text-cyan-400", scanning && "animate-pulse")} />
                            <span className="text-[10px] font-bold text-cyan-400 tracking-widest">PROBE TELEMETRY STREAM</span>
                        </div>
                        <div ref={logsRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 text-[10px] space-y-0.5">
                            {logs.length === 0 ? (
                                <p className="text-slate-700 text-center py-8 tracking-widest">Awaiting scan initialization...</p>
                            ) : logs.map(log => (
                                <div key={log.id} className={clsx("flex gap-2",
                                    log.type === 'critical' ? 'text-rose-400' :
                                        log.type === 'success' ? 'text-emerald-400' :
                                            log.type === 'warning' ? 'text-amber-400' :
                                                log.type === 'system' ? 'text-cyan-600' : 'text-slate-400'
                                )}>
                                    <span className="text-slate-700 shrink-0">[{log.ts}]</span>
                                    <span>{log.text}</span>
                                </div>
                            ))}
                            {scanning && <div className="text-cyan-600 animate-pulse flex gap-2"><ChevronRight size={12} /><span>scanning_</span></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
