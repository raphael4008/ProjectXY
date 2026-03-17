"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Search, Play, CheckCircle2, AlertTriangle, Database, Code, Radio, ChevronRight, Zap, Eye, RefreshCw, Copy } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HuntQuery {
    id: string;
    name: string;
    description: string;
    category: string;
    mitre: string;
    query: string;
    risk: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

interface HuntResult {
    id: string;
    ts: string;
    host: string;
    user?: string;
    raw: string;
    hit: boolean;
}

interface HuntLog {
    id: string;
    ts: string;
    text: string;
    type: 'info' | 'success' | 'error' | 'system';
}

// ─── Pre-built Hunt Queries ───────────────────────────────────────────────────

const HUNT_LIBRARY: HuntQuery[] = [
    {
        id: 'q1', name: 'LSASS Memory Access Hunt', category: 'Credential Access', mitre: 'T1003.001', risk: 'CRITICAL',
        description: 'Detect process access to LSASS memory — primary credential dumping indicator.',
        query: `SELECT pe.process_name, pa.pid, pa.target_pid, pa.access_mask\nFROM process_access pa\nJOIN process_events pe ON pa.pid = pe.pid\nWHERE pa.target_name LIKE '%lsass%'\nAND pa.access_mask IN ('0x1010', '0x1038', '0x143a')\nORDER BY pa.timestamp DESC`,
    },
    {
        id: 'q2', name: 'Kerberoastable Account Discovery', category: 'Credential Access', mitre: 'T1558.003', risk: 'HIGH',
        description: 'Find service accounts with SPN set and old password — prime Kerberoasting targets.',
        query: `Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName, PasswordLastSet, Enabled |\nWhere-Object {$_.Enabled -eq $true -and $_.PasswordLastSet -lt (Get-Date).AddDays(-90)} |\nSelect-Object Name, SamAccountName, ServicePrincipalName, PasswordLastSet |\nSort-Object PasswordLastSet`,
    },
    {
        id: 'q3', name: 'DNS Tunneling Detection', category: 'C2', mitre: 'T1071.004', risk: 'CRITICAL',
        description: 'Detect anomalously high DNS query volume or long subdomain strings characteristic of DNS tunneling.',
        query: `SELECT src_ip, dst_domain, COUNT(*) as queries_per_hour,\n       AVG(LENGTH(dst_domain)) as avg_domain_len,\n       entropy(dst_domain) as query_entropy\nFROM dns_log\nWHERE timestamp > NOW() - INTERVAL '1 hour'\nGROUP BY src_ip, dst_domain\nHAVING queries_per_hour > 500\n   OR avg_domain_len > 40\n   OR query_entropy > 4.0\nORDER BY query_entropy DESC`,
    },
    {
        id: 'q4', name: 'Lateral Movement via PtH/PtT', category: 'Lateral Movement', mitre: 'T1550.002', risk: 'CRITICAL',
        description: 'Detect pass-the-hash / pass-the-ticket by finding NTLM auth with no logon from same source.',
        query: `SELECT EventID, SubjectUserName, TargetUserName, IpAddress,\n       LogonType, AuthenticationPackageName\nFROM Windows.Security.EVTX\nWHERE EventID = 4624\n  AND LogonType = 3\n  AND AuthenticationPackageName = 'NTLM'\n  AND IpAddress NOT IN (SELECT ip FROM known_workstations)\n  AND SubjectUserName NOT LIKE '%$'   -- exclude computer accounts\nORDER BY TimeCreated DESC`,
    },
    {
        id: 'q5', name: 'Scheduled Task Persistence Hunt', category: 'Persistence', mitre: 'T1053.005', risk: 'HIGH',
        description: 'Find newly created or modified scheduled tasks outside known-good baselines.',
        query: `SELECT e.EventID, e.TaskName, e.Action, e.Author,\n       e.Command, e.TimeCreated\nFROM Windows.System.TaskScheduler e\nWHERE e.EventID IN (4698, 4702)\n  AND e.TimeCreated > DATEADD(hour, -24, GETDATE())\n  AND e.Author NOT IN (SELECT author FROM task_baseline)\nORDER BY e.TimeCreated DESC`,
    },
    {
        id: 'q6', name: 'Beacon Jitter Pattern (Cobalt Strike)', category: 'C2', mitre: 'T1071.001', risk: 'CRITICAL',
        description: 'Identify regular beaconing intervals (±20% jitter) characteristic of Cobalt Strike CS profiles.',
        query: `WITH session_intervals AS (\n  SELECT src_ip, dst_ip, dst_port,\n         TIMESTAMPDIFF(SECOND, LAG(ts) OVER (PARTITION BY src_ip ORDER BY ts), ts) AS interval_secs\n  FROM netflow WHERE proto = 'TCP' AND dst_port IN (80, 443, 8443)\n)\nSELECT src_ip, dst_ip, dst_port,\n       AVG(interval_secs) AS mean_interval,\n       STDDEV(interval_secs) AS jitter,\n       COUNT(*) AS connections\nFROM session_intervals\nGROUP BY src_ip, dst_ip, dst_port\nHAVING connections > 50 AND jitter / mean_interval < 0.25`,
    },
];

function generateHits(query: HuntQuery): HuntResult[] {
    const pool = [
        { host: 'WORKSTN-089', user: 'j.morrison', raw: `process_access: svchost.exe → lsass.exe (0x1010) PID:4892 TS:${new Date().toISOString()}`, hit: true },
        { host: 'DC-01', user: 'svc_backup', raw: `logon_type:3 NTLM auth from 10.0.1.45 — no matching logon4648 TS:${new Date().toISOString()}`, hit: true },
        { host: 'FILESERVER-01', user: 'svc_deploy', raw: `new_task: WindowsDefenderUpdate → C:\\Temp\\svchst.exe /persist TS:${new Date().toISOString()}`, hit: true },
        { host: '10.0.1.22', user: undefined, raw: `dns_query: entropy=4.81 domain=a3f2k.corp-internal-vpn.net queries=8420/hr TS:${new Date().toISOString()}`, hit: true },
        { host: 'DB-CLUSTER-01', user: undefined, raw: `scheduled_dns beacon: interval=30.2s jitter=4.3s (14.2%) connections=847`, hit: true },
        { host: 'WORKSTN-022', user: 'e.chen', raw: `spn_enum: svc_sqlserver/db01.corp.local (PasswordAge: 412 days)`, hit: false },
    ];
    return pool.slice(0, Math.floor(Math.random() * 4 + 2)).map((h, i) => ({ ...h, id: `${Date.now()}-${i}`, ts: new Date().toLocaleTimeString('en-GB', { hour12: false }) }));
}

export default function ThreatHuntPage() {
    const [selectedQuery, setSelectedQuery] = useState<HuntQuery>(HUNT_LIBRARY[0]);
    const [customQuery, setCustomQuery] = useState(HUNT_LIBRARY[0].query);
    const [isHunting, setIsHunting] = useState(false);
    const [results, setResults] = useState<HuntResult[]>([]);
    const [logs, setLogs] = useState<HuntLog[]>([
        { id: 'b1', ts: '', text: '╔══════ NEXUS THREAT HUNT WORKBENCH — BLUE TEAM L2 ANALYST ══════╗', type: 'system' },
        { id: 'b2', ts: '', text: '  SIEM Query Engine · Behavioral Hunt · MITRE Mapping · IOC Extract  ', type: 'system' },
        { id: 'b3', ts: '', text: '╚═════════════════════════════════════════════════════════════════╝', type: 'system' },
    ]);
    const logsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCustomQuery(selectedQuery.query);
    }, [selectedQuery]);

    useEffect(() => {
        logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((text: string, type: HuntLog['type'] = 'info') => {
        setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ts: new Date().toLocaleTimeString('en-GB', { hour12: false }), text, type }]);
    }, []);

    const runHunt = async () => {
        setIsHunting(true); setResults([]);
        addLog(`[*] Executing hunt: "${selectedQuery.name}"`, 'system');
        addLog(`[*] MITRE: ${selectedQuery.mitre} | Risk: ${selectedQuery.risk}`, 'info');
        addLog(`[*] Querying SIEM across 247 endpoints...`, 'info');

        await new Promise(res => setTimeout(res, 800));
        addLog(`[*] Scanning process access logs (last 24h)...`, 'info');
        await new Promise(res => setTimeout(res, 700));
        addLog(`[*] Cross-referencing against baseline deviation model...`, 'info');
        await new Promise(res => setTimeout(res, 900));

        const hits = generateHits(selectedQuery);
        setResults(hits);
        const trueHits = hits.filter(h => h.hit);

        if (trueHits.length > 0) {
            addLog(`[!] ${trueHits.length} MATCHES FOUND — ${selectedQuery.mitre} activity detected!`, 'error');
            trueHits.forEach(h => addLog(`    → HOST: ${h.host}${h.user ? ` USER: ${h.user}` : ''}`, 'error'));
        } else {
            addLog(`[+] No significant matches — environment appears clean`, 'success');
        }
        addLog(`[+] Hunt complete — ${hits.length} events analyzed`, 'success');
        setIsHunting(false);
    };

    const RISK_CFG = { CRITICAL: 'text-rose-400 border-rose-800 bg-rose-950/40', HIGH: 'text-orange-400 border-orange-800 bg-orange-950/30', MEDIUM: 'text-amber-400 border-amber-800 bg-amber-950/20' };

    return (
        <div className="flex flex-col h-screen bg-[#040608] text-slate-300 font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,80,50,0.08)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 px-6 py-3 border-b border-emerald-900/30 bg-black/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Search size={18} className="text-emerald-400" />
                    <div>
                        <h1 className="text-base font-bold text-emerald-400 tracking-widest">NEXUS THREAT HUNT WORKBENCH — SOC ANALYST L2</h1>
                        <p className="text-[9px] text-emerald-900 tracking-widest">SIEM Query Engine · Behavioral Hunt Library · IOC Extraction · MITRE Mapping</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border border-emerald-700 bg-emerald-950/30 text-emerald-400 rounded text-[9px] font-bold">
                    <Shield size={10} /> BLUE TEAM L2 — ELEVATED HUNT AUTHORITY
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Hunt library */}
                <div className="col-span-3 border-r border-emerald-900/20 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-emerald-900/20 bg-black/40 flex items-center gap-2 shrink-0">
                        <Database size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-500 tracking-widest">HUNT LIBRARY</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {HUNT_LIBRARY.map(q => (
                            <div key={q.id} onClick={() => setSelectedQuery(q)}
                                className={clsx("px-3 py-2.5 border-b border-slate-900/70 cursor-pointer transition-all hover:bg-slate-900/20",
                                    selectedQuery.id === q.id && "bg-emerald-950/20 border-l-2 border-l-emerald-500")}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={clsx("text-[7px] font-bold px-1.5 py-0.5 rounded border", RISK_CFG[q.risk])}>{q.risk}</span>
                                    <span className="text-[8px] border border-slate-700 text-slate-600 px-1 rounded">{q.mitre}</span>
                                </div>
                                <p className="text-[10px] font-bold text-emerald-300 mb-0.5">{q.name}</p>
                                <p className="text-[8px] text-slate-600 leading-relaxed">{q.description}</p>
                                <p className="text-[8px] text-slate-700 mt-1">{q.category}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: Query editor + results */}
                <div className="col-span-6 border-r border-emerald-900/20 flex flex-col overflow-hidden">
                    {/* Query editor */}
                    <div className="flex flex-col" style={{ height: '45%' }}>
                        <div className="px-3 py-1.5 border-b border-emerald-900/20 bg-black/50 flex items-center gap-2 justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Code size={10} className="text-emerald-500" />
                                <span className="text-[9px] font-bold text-emerald-400 tracking-widest">SIEM QUERY EDITOR</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setCustomQuery(selectedQuery.query)} className="text-[8px] border border-slate-700 text-slate-500 px-2 py-0.5 rounded hover:border-slate-500 transition-colors">RESET</button>
                                <button onClick={() => { navigator.clipboard.writeText(customQuery); }} className="text-[8px] border border-slate-700 text-slate-500 px-2 py-0.5 rounded hover:border-slate-500 transition-colors flex items-center gap-1"><Copy size={7} /> COPY</button>
                            </div>
                        </div>
                        <textarea value={customQuery} onChange={e => setCustomQuery(e.target.value)}
                            className="flex-1 bg-black/40 text-[10px] text-emerald-300 font-mono p-3 resize-none focus:outline-none leading-relaxed border-b border-emerald-900/20 custom-scrollbar"
                            spellCheck={false} />
                    </div>

                    {/* Run button */}
                    <div className="px-3 py-2 bg-black/60 border-b border-emerald-900/20 shrink-0">
                        <button onClick={runHunt} disabled={isHunting}
                            className={clsx("w-full flex items-center justify-center gap-2 py-2 rounded border text-xs font-bold tracking-widest transition-all",
                                isHunting ? "border-emerald-700 text-emerald-500 animate-pulse cursor-not-allowed" :
                                    "border-emerald-600 text-white bg-emerald-900/30 hover:bg-emerald-800/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]")}>
                            {isHunting ? <><Radio size={12} className="animate-pulse" /> HUNTING...</> : <><Play size={12} /> EXECUTE HUNT — {selectedQuery.name}</>}
                        </button>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
                                <Search size={24} />
                                <p className="text-[10px] tracking-widest">Run a hunt to see results</p>
                            </div>
                        ) : results.map(r => (
                            <div key={r.id} className={clsx("px-4 py-3 border-b border-slate-900/70 transition-colors",
                                r.hit ? "bg-rose-950/10" : "bg-black/20")}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    {r.hit ? <AlertTriangle size={10} className="text-rose-400 shrink-0" /> : <CheckCircle2 size={10} className="text-slate-600 shrink-0" />}
                                    <span className={clsx("text-[9px] font-bold", r.hit ? "text-rose-400" : "text-slate-500")}>{r.hit ? 'MATCH DETECTED' : 'NO MATCH'}</span>
                                    <span className="text-[9px] text-slate-500">HOST: <span className="text-slate-300">{r.host}</span></span>
                                    {r.user && <span className="text-[9px] text-slate-600">USER: <span className="text-amber-400">{r.user}</span></span>}
                                    <span className="text-[8px] text-slate-700 ml-auto">{r.ts}</span>
                                </div>
                                <code className={clsx("text-[9px] leading-relaxed break-all", r.hit ? "text-rose-300" : "text-slate-600")}>{r.raw}</code>
                                {r.hit && (
                                    <div className="flex gap-1 mt-2">
                                        <button className="text-[8px] border border-amber-800 text-amber-500 px-2 py-0.5 rounded hover:bg-amber-950/30 transition-colors">INVESTIGATE</button>
                                        <button className="text-[8px] border border-rose-800 text-rose-500 px-2 py-0.5 rounded hover:bg-rose-950/30 transition-colors">ISOLATE HOST</button>
                                        <button className="text-[8px] border border-emerald-800 text-emerald-500 px-2 py-0.5 rounded hover:bg-emerald-950/30 transition-colors">CREATE IOC</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Execution log */}
                <div className="col-span-3 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-emerald-900/20 bg-black/40 flex items-center gap-2 shrink-0">
                        <Radio size={10} className={clsx("text-emerald-500", isHunting && "animate-pulse")} />
                        <span className="text-[9px] font-bold text-emerald-500 tracking-widest">HUNT ENGINE LOG</span>
                    </div>
                    <div ref={logsRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 text-[9px] space-y-0.5">
                        {logs.map(log => (
                            <div key={log.id} className={clsx("leading-relaxed flex gap-1",
                                log.type === 'success' ? 'text-emerald-400' :
                                    log.type === 'error' ? 'text-rose-400 font-bold' :
                                        log.type === 'system' ? 'text-cyan-400' : 'text-slate-500')}>
                                {log.ts && <span className="text-slate-800 shrink-0">[{log.ts}]</span>}
                                <span>{log.text}</span>
                            </div>
                        ))}
                        {isHunting && <div className="flex gap-1 text-emerald-600 animate-pulse"><ChevronRight size={10} /><span>_</span></div>}
                    </div>

                    {/* Query info */}
                    <div className="border-t border-emerald-900/20 p-3 bg-black/60 shrink-0">
                        <div className="text-[8px] text-slate-700 mb-2 tracking-widest">ACTIVE HUNT PROFILE</div>
                        <div className="space-y-1.5">
                            <div><span className="text-[8px] text-slate-600">NAME:</span> <span className="text-[8px] text-emerald-400">{selectedQuery.name}</span></div>
                            <div><span className="text-[8px] text-slate-600">CAT:</span> <span className="text-[8px] text-slate-300">{selectedQuery.category}</span></div>
                            <div><span className="text-[8px] text-slate-600">MITRE:</span> <span className="text-[8px] text-slate-300">{selectedQuery.mitre}</span></div>
                            <div><span className="text-[8px] text-slate-600">RISK:</span> <span className={clsx("text-[8px] font-bold", selectedQuery.risk === 'CRITICAL' ? 'text-rose-400' : selectedQuery.risk === 'HIGH' ? 'text-orange-400' : 'text-amber-400')}>{selectedQuery.risk}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
