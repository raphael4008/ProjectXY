"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, AlertTriangle, ShieldAlert, Eye, FileWarning, Terminal,
    Activity, Clock, CheckCircle2, XCircle, Play, Zap, Lock,
    Network, Database, Globe, Crosshair, Radio, BrainCircuit,
    TrendingUp, Info
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Alert {
    id: string;
    ts: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    message: string;
    src_ip?: string;
    host?: string;
    mitre?: string;
    status: 'NEW' | 'INVESTIGATING' | 'CONTAINED' | 'FALSE_POSITIVE';
}

interface Playbook {
    id: string;
    name: string;
    trigger: string;
    steps: string[];
    status: 'READY' | 'RUNNING' | 'COMPLETE';
    icon: React.ReactNode;
    color: string;
}

interface SOCMetric {
    label: string;
    value: string | number;
    sub?: string;
    color: string;
    trend?: 'up' | 'down' | 'stable';
}

// ─── Static live alert pool ─────────────────────────────────────────────────

const ALERT_POOL: Omit<Alert, 'id' | 'ts' | 'status'>[] = [
    { severity: 'CRITICAL', type: 'INTRUSION', message: 'LSASS memory read on DC-01 — credential dumping in progress', src_ip: '10.0.1.45', host: 'DC-01', mitre: 'T1003.001' },
    { severity: 'CRITICAL', type: 'RANSOMWARE', message: 'Ransomware pre-detonation pattern in WORKSTN-089 memory (LockBit IOC)', host: 'WORKSTN-089', mitre: 'T1486' },
    { severity: 'HIGH', type: 'LATERAL_MOVEMENT', message: 'Suspicious SMB auth chain: 10.0.1.45 → 10.0.1.12 → 10.0.2.3', src_ip: '10.0.1.45', mitre: 'T1021.002' },
    { severity: 'HIGH', type: 'PERSISTENCE', message: 'New scheduled task "WindowsDefenderUpdate" created on FILESERVER-01', host: 'FILESERVER-01', mitre: 'T1053.005' },
    { severity: 'HIGH', type: 'EXFILTRATION', message: '2.3GB upload to external CDN from FILESERVER-01 over HTTPS (port 443)', src_ip: '10.0.5.11', host: 'FILESERVER-01', mitre: 'T1041' },
    { severity: 'CRITICAL', type: 'ACCESS', message: 'Impossible travel: admin@corp.com authenticated from US + EU simultaneously', mitre: 'T1078' },
    { severity: 'HIGH', type: 'C2', message: 'Anomalous DNS TXT query volume from 10.0.1.22 — DNS tunneling IOC', src_ip: '10.0.1.22', mitre: 'T1071.004' },
    { severity: 'MEDIUM', type: 'RECON', message: 'Nmap OS detection sweep from 192.168.1.254 against internal subnet', src_ip: '192.168.1.254' },
    { severity: 'HIGH', type: 'HONEYPOT', message: 'Honey token accessed: fake AWS creds in /backup/.env triggered by 185.220.101.45', src_ip: '185.220.101.45' },
    { severity: 'MEDIUM', type: 'ANOMALY', message: 'UEBA: svc_backup account active at 03:14 UTC — 6σ deviation from baseline' },
    { severity: 'LOW', type: 'CONFIG', message: 'Outbound allow rule added to NGFW for port 4444 (Metasploit default)', mitre: 'T1562.004' },
    { severity: 'CRITICAL', type: 'SUPPLY_CHAIN', message: 'Backdoor detected in Docker image pushed to ECR registry — CI/CD pipeline compromise', mitre: 'T1195' },
];

const SEV_CFG = {
    CRITICAL: { ring: 'border-rose-600', bg: 'bg-rose-950/30', badge: 'bg-rose-950 border-rose-700 text-rose-400', dot: 'bg-rose-500', text: 'text-rose-400' },
    HIGH: { ring: 'border-orange-600', bg: 'bg-orange-950/20', badge: 'bg-orange-950 border-orange-700 text-orange-400', dot: 'bg-orange-500', text: 'text-orange-400' },
    MEDIUM: { ring: 'border-amber-600', bg: 'bg-amber-950/10', badge: 'bg-amber-950 border-amber-700 text-amber-400', dot: 'bg-amber-500', text: 'text-amber-400' },
    LOW: { ring: 'border-slate-600', bg: 'bg-slate-900/20', badge: 'bg-slate-900 border-slate-700 text-slate-400', dot: 'bg-slate-500', text: 'text-slate-400' },
};

const STATUS_CFG = {
    NEW: { label: 'NEW', color: 'text-rose-400 bg-rose-950/50 border-rose-700' },
    INVESTIGATING: { label: 'INVESTIGATING', color: 'text-amber-400 bg-amber-950/50 border-amber-700' },
    CONTAINED: { label: 'CONTAINED', color: 'text-emerald-400 bg-emerald-950/50 border-emerald-700' },
    FALSE_POSITIVE: { label: 'FALSE+', color: 'text-slate-400 bg-slate-900 border-slate-700' },
};

export default function DefensePage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
    const [playbookLog, setPlaybookLog] = useState<string[]>([]);
    const [activePlaybook, setActivePlaybook] = useState<string | null>(null);
    const [deployStatus, setDeployStatus] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    // Metrics counters
    const [metrics, setMetrics] = useState({ criticals: 0, contained: 0, mttd: '4m 12s', mtta: '1m 08s', open: 0 });

    const addAlert = useCallback((data: Omit<Alert, 'id' | 'ts' | 'status'>) => {
        const alert: Alert = { ...data, id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString(), status: 'NEW' };
        setAlerts(prev => [alert, ...prev].slice(0, 80));
        if (data.severity === 'CRITICAL') setMetrics(m => ({ ...m, criticals: m.criticals + 1, open: m.open + 1 }));
        else setMetrics(m => ({ ...m, open: m.open + 1 }));
    }, []);

    // Boot with initial events then stream more
    useEffect(() => {
        ALERT_POOL.slice(0, 5).forEach((ev, i) => setTimeout(() => addAlert(ev), i * 500));
        const t = setInterval(() => {
            addAlert(ALERT_POOL[Math.floor(Math.random() * ALERT_POOL.length)]);
        }, Math.random() * 10000 + 6000);
        return () => clearInterval(t);
    }, [addAlert]);

    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, [playbookLog]);

    const updateAlertStatus = (id: string, status: Alert['status']) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        if (status === 'CONTAINED') {
            setMetrics(m => ({ ...m, contained: m.contained + 1, open: Math.max(0, m.open - 1) }));
        }
    };

    const execPlaybook = useCallback((pb: Playbook) => {
        if (activePlaybook) return;
        setActivePlaybook(pb.id);
        setPlaybookLog([`[NEXUS-SOAR] Initiating playbook: ${pb.name}`, `[*] Trigger context: ${pb.trigger}`]);
        let i = 0;
        const t = setInterval(() => {
            if (i < pb.steps.length) {
                setPlaybookLog(prev => [...prev, pb.steps[i]]);
                i++;
            } else {
                setPlaybookLog(prev => [...prev, `[✓] Playbook ${pb.name} — COMPLETE. Threat contained.`]);
                setActivePlaybook(null);
                setMetrics(m => ({ ...m, contained: m.contained + 1, open: Math.max(0, m.open - 1) }));
                clearInterval(t);
            }
        }, 900);
    }, [activePlaybook]);

    const deployDecoy = async (type: 'env' | 'yaml') => {
        setDeployStatus(`Deploying ${type.toUpperCase()} honey-token...`);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/defense/decoys/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type, path: '/tmp' }),
            });
            const d = await r.json();
            setDeployStatus(`✓ ${d.message || 'Honey-token active'}`);
        } catch {
            setDeployStatus(`✓ Honey-token deployed to /var/trap/.fake_${type} (simulated)`);
        }
        setTimeout(() => setDeployStatus(null), 5000);
    };

    const PLAYBOOKS: Playbook[] = [
        {
            id: 'isolate', name: 'NETWORK ISOLATION', trigger: 'High-confidence lateral movement / ransomware IOC',
            steps: [
                '[*] Querying NGFW API for ACL rules...',
                '[*] Adding DROP rule: src 10.0.1.45 all ports → ISOLATED',
                '[*] Revoking active sessions from user: svc_backup on DC-01',
                '[*] Pushing IOC block to 47 edge nodes via Hive-Mind...',
                '[+] Endpoint isolated. Lateral movement vector severed.',
                '[*] Creating forensic memory snapshot for investigation...',
            ],
            status: 'READY', icon: <Lock size={14} />, color: 'text-rose-400 border-rose-700',
        },
        {
            id: 'credential_reset', name: 'CREDENTIAL INVALIDATION', trigger: 'Credential dump / impossible travel anomaly',
            steps: [
                '[*] Invoking Azure AD / LDAP emergency password reset...',
                '[*] Revoking all active OAuth refresh tokens for admin@corp.com...',
                '[*] Terminating 3 active sessions (US, EU, unknown VPN)...',
                '[*] Enforcing step-up MFA for all privileged accounts...',
                '[+] All credentials invalidated. MFA challenge active.',
            ],
            status: 'READY', icon: <Shield size={14} />, color: 'text-amber-400 border-amber-700',
        },
        {
            id: 'honeypot_activate', name: 'DECEPTIVE LATTICE ACTIVATION', trigger: 'External recon / port scan detected',
            steps: [
                '[*] Spinning up Ghost Protocol honeypot cluster...',
                '[*] Deploying fake SMB shares with credential lures on 192.168.1.250...',
                '[*] Activating fake RDP endpoint with keylogging capture...',
                '[*] Linking deception layer to Correlation Engine for attribution...',
                '[+] Deceptive lattice online — attacker tunnel into honeynet.',
            ],
            status: 'READY', icon: <Eye size={14} />, color: 'text-purple-400 border-purple-700',
        },
        {
            id: 'yara_deploy', name: 'SENTINEL YARA DEPLOYMENT', trigger: 'Malware behavioral IOC detected',
            steps: [
                '[*] Sentinel Catalyst generating custom YARA rule from behavioral IOC...',
                '[*] Compiling YARA rule: NEXUS_RANSOMWARE_LOCKBIT_v3_BEHAVIORAL...',
                '[*] Pushing rule to 247 endpoint agents via Hive-Mind...',
                '[*] Initiating memory scans on all Windows hosts...',
                '[+] YARA rule deployed. 3 additional infected hosts identified.',
                '[*] Flagging hosts for manual forensic review.',
            ],
            status: 'READY', icon: <BrainCircuit size={14} />, color: 'text-cyan-400 border-cyan-700',
        },
    ];

    const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter);

    const socMetrics: SOCMetric[] = [
        { label: 'OPEN INCIDENTS', value: metrics.open, color: 'text-rose-400', trend: 'up' },
        { label: 'CRITICALS', value: metrics.criticals, color: 'text-orange-400', trend: 'up' },
        { label: 'CONTAINED', value: metrics.contained, color: 'text-emerald-400', trend: 'down' },
        { label: 'MTTD', value: metrics.mttd, color: 'text-amber-400', sub: 'Mean Time to Detect' },
        { label: 'MTTA', value: metrics.mtta, color: 'text-cyan-400', sub: 'Mean Time to Acknowledge' },
        { label: 'SOC HEALTH', value: '96%', color: 'text-emerald-400', trend: 'stable' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#040507] text-slate-300 font-mono overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(0,50,80,0.12)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-emerald-900/30 bg-black/60 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <Shield size={20} className="text-emerald-400" />
                    <div>
                        <h1 className="text-base font-bold text-emerald-400 tracking-widest">NEXUS-SOAR — BLUE TEAM SOC COMMAND</h1>
                        <p className="text-[9px] text-emerald-900 tracking-widest">Automated Response · Threat Hunting · Playbook Orchestration · Deception Lattice</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest">SOC LIVE — OPERATIONAL</span>
                </div>
            </header>

            {/* SOC Metrics Bar */}
            <div className="relative z-10 grid grid-cols-6 border-b border-slate-800/40 bg-black/40 shrink-0">
                {socMetrics.map((m, i) => (
                    <div key={i} className="flex flex-col items-center py-3 border-r border-slate-800/40 last:border-r-0">
                        <span className={clsx("text-xl font-bold font-mono", m.color)}>{m.value}</span>
                        <span className="text-[8px] text-slate-700 tracking-widest text-center">{m.label}</span>
                        {m.sub && <span className="text-[7px] text-slate-800 text-center">{m.sub}</span>}
                    </div>
                ))}
            </div>

            {/* Main Layout */}
            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Live Alert Feed */}
                <div className="col-span-5 flex flex-col border-r border-slate-800/40 overflow-hidden">

                    {/* Filter bar */}
                    <div className="flex items-center gap-1 p-2 border-b border-slate-800/40 bg-black/40 shrink-0">
                        <AlertTriangle size={11} className="text-rose-400 mr-1" />
                        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={clsx("text-[9px] px-2 py-1 rounded border font-bold tracking-widest transition-all",
                                    filter === f
                                        ? f === 'CRITICAL' ? 'bg-rose-950 border-rose-600 text-rose-400'
                                            : f === 'HIGH' ? 'bg-orange-950 border-orange-600 text-orange-400'
                                                : f === 'MEDIUM' ? 'bg-amber-950 border-amber-600 text-amber-400'
                                                    : f === 'LOW' ? 'bg-slate-800 border-slate-600 text-slate-300'
                                                        : 'bg-slate-800 border-slate-600 text-white'
                                        : 'border-slate-800 text-slate-600 hover:text-slate-400'
                                )}>
                                {f}
                            </button>
                        ))}
                        <span className="ml-auto text-[8px] text-slate-700">{filtered.length} events</span>
                    </div>

                    {/* Alert list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
                                <Shield size={24} />
                                <p className="text-[10px] tracking-widest">All clear — monitoring in progress</p>
                            </div>
                        ) : filtered.map(alert => {
                            const sev = SEV_CFG[alert.severity];
                            const sta = STATUS_CFG[alert.status];
                            return (
                                <div key={alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                    className={clsx(
                                        "p-3 border-b border-slate-900 cursor-pointer transition-colors hover:bg-slate-900/40",
                                        selectedAlert?.id === alert.id && "bg-slate-900/60 border-l-2",
                                        selectedAlert?.id === alert.id && sev.ring,
                                        alert.severity === 'CRITICAL' && alert.status === 'NEW' && 'bg-rose-950/10'
                                    )}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", sev.dot, alert.severity === 'CRITICAL' && alert.status === 'NEW' && 'animate-pulse')} />
                                        <span className={clsx("text-[8px] font-bold px-1.5 py-0.5 rounded border", sev.badge)}>{alert.severity}</span>
                                        <span className="text-[8px] text-slate-600 bg-slate-900 border border-slate-800 px-1 rounded">{alert.type}</span>
                                        {alert.mitre && <span className="text-[8px] text-slate-600 border border-slate-800 px-1 rounded">{alert.mitre}</span>}
                                        <span className={clsx("ml-auto text-[8px] px-1.5 py-0.5 rounded border font-bold", sta.color)}>{sta.label}</span>
                                        <span className="text-[8px] text-slate-700">{alert.ts}</span>
                                    </div>
                                    <p className={clsx("text-[10px] leading-relaxed", sev.text)}>{alert.message}</p>
                                    {(alert.src_ip || alert.host) && (
                                        <div className="flex gap-3 mt-1">
                                            {alert.src_ip && <span className="text-[8px] text-slate-600">SRC: <span className="text-slate-500 font-mono">{alert.src_ip}</span></span>}
                                            {alert.host && <span className="text-[8px] text-slate-600">HOST: <span className="text-slate-500 font-mono">{alert.host}</span></span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER-RIGHT: Alert Inspector + Playbooks */}
                <div className="col-span-4 flex flex-col border-r border-slate-800/40 overflow-hidden">

                    {/* Alert inspector */}
                    {selectedAlert ? (() => {
                        const sev = SEV_CFG[selectedAlert.severity];
                        return (
                            <div className="border-b border-slate-800/40 shrink-0">
                                <div className={clsx("px-4 py-2 border-b flex items-center justify-between", sev.ring, "bg-black/60")}>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("w-2 h-2 rounded-full", sev.dot)} />
                                        <span className={clsx("text-xs font-bold", sev.text)}>{selectedAlert.severity} — {selectedAlert.type}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {(['INVESTIGATING', 'CONTAINED', 'FALSE_POSITIVE'] as Alert['status'][]).map(s => (
                                            <button key={s} onClick={() => updateAlertStatus(selectedAlert.id, s)}
                                                className={clsx("text-[8px] px-2 py-1 rounded border font-bold transition-all",
                                                    STATUS_CFG[s].color, "hover:opacity-80")}>
                                                {STATUS_CFG[s].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className={clsx("p-4 space-y-2", sev.bg)}>
                                    <p className="text-xs text-slate-300 leading-relaxed">{selectedAlert.message}</p>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
                                        {selectedAlert.src_ip && <div><span className="text-slate-600">SOURCE IP</span><br /><span className="font-mono text-rose-400">{selectedAlert.src_ip}</span></div>}
                                        {selectedAlert.host && <div><span className="text-slate-600">HOST</span><br /><span className="font-mono text-amber-400">{selectedAlert.host}</span></div>}
                                        {selectedAlert.mitre && <div><span className="text-slate-600">MITRE</span><br /><a href={`https://attack.mitre.org/techniques/${selectedAlert.mitre.replace('.', '/')}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{selectedAlert.mitre} ↗</a></div>}
                                        <div><span className="text-slate-600">TIME</span><br /><span className="text-slate-400">{selectedAlert.ts}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="p-6 flex flex-col items-center justify-center text-slate-700 gap-2 border-b border-slate-800/40 shrink-0">
                            <Crosshair size={20} />
                            <p className="text-[10px] tracking-widest">Select an alert to inspect</p>
                        </div>
                    )}

                    {/* Automated Response Playbooks */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-3 border-b border-slate-800/40 flex items-center gap-2 bg-black/40">
                            <Zap size={12} className="text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-400 tracking-widest">NEXUS-SOAR PLAYBOOKS</span>
                        </div>
                        <div className="p-3 space-y-2">
                            {PLAYBOOKS.map(pb => (
                                <div key={pb.id} className="bg-black/40 border border-slate-800/60 rounded p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className={clsx("flex items-center gap-2", pb.color)}>
                                            {pb.icon}
                                            <span className="text-[10px] font-bold tracking-widest">{pb.name}</span>
                                        </div>
                                        <button
                                            onClick={() => execPlaybook(pb)}
                                            disabled={activePlaybook !== null}
                                            className={clsx(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold border transition-all",
                                                activePlaybook === pb.id
                                                    ? "border-amber-600 text-amber-400 bg-amber-950/30 animate-pulse"
                                                    : activePlaybook !== null
                                                        ? "border-slate-800 text-slate-700 cursor-not-allowed"
                                                        : "border-emerald-700 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40"
                                            )}>
                                            <Play size={10} />
                                            {activePlaybook === pb.id ? 'RUNNING' : 'EXECUTE'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-600">TRIGGER: {pb.trigger}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FAR RIGHT: SOAR Terminal + Decoy Panel */}
                <div className="col-span-3 flex flex-col overflow-hidden">

                    {/* SOAR execution log */}
                    <div className="flex-1 flex flex-col border-b border-slate-800/40 min-h-0">
                        <div className="p-3 border-b border-slate-800/40 bg-black/40 flex items-center gap-2 shrink-0">
                            <Terminal size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-400 tracking-widest">SOAR EXECUTION LOG</span>
                        </div>
                        <div ref={logRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 text-[10px] space-y-0.5">
                            {playbookLog.length === 0 ? (
                                <p className="text-slate-700 text-center py-6 tracking-widest">Execute a playbook to begin automated response</p>
                            ) : playbookLog.map((log, i) => (
                                <div key={i} className={clsx("leading-relaxed",
                                    log.includes('[✓]') ? 'text-emerald-400 font-bold' :
                                        log.includes('[*]') ? 'text-cyan-500' :
                                            log.includes('[+]') ? 'text-emerald-400' :
                                                log.includes('[!]') ? 'text-rose-400' : 'text-slate-500'
                                )}>{log}</div>
                            ))}
                            {activePlaybook && (
                                <div className="text-emerald-600 animate-pulse">running_</div>
                            )}
                        </div>
                    </div>

                    {/* Decoy Deployment Panel */}
                    <div className="shrink-0">
                        <div className="p-3 border-b border-slate-800/40 bg-black/40 flex items-center gap-2">
                            <Eye size={12} className="text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-400 tracking-widest">HONEY-TOKEN ARSENAL</span>
                        </div>
                        <div className="p-3 space-y-2">
                            <p className="text-[9px] text-slate-700 leading-relaxed">Deploy canary files — any access triggers an instant high-fidelity alert.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { type: 'env' as const, label: '.ENV DECOY', sub: 'Fake DB credentials', icon: <Database size={11} /> },
                                    { type: 'yaml' as const, label: 'K8S DECOY', sub: 'Fake kubeconfig', icon: <Network size={11} /> },
                                ].map(d => (
                                    <button key={d.type} onClick={() => deployDecoy(d.type)}
                                        className="bg-black/60 border border-purple-900/40 hover:border-purple-600/50 rounded p-2.5 text-left transition-all group">
                                        <div className="flex items-center gap-1.5 text-purple-400 mb-1">{d.icon} <span className="text-[9px] font-bold">{d.label}</span></div>
                                        <p className="text-[8px] text-slate-600">{d.sub}</p>
                                    </button>
                                ))}
                            </div>
                            {deployStatus && (
                                <div className="text-[9px] text-emerald-400 bg-emerald-950/30 border border-emerald-800 px-2 py-1.5 rounded font-mono">
                                    {deployStatus}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
