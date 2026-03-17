import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Terminal, ShieldAlert, Cpu, Radar, Wifi, Lock, Zap, Eye,
    Network, Database, Shield, AlertTriangle, CheckCircle2,
    Play, Square, Radio, X, ChevronRight, HelpCircle, Crosshair, Globe, Search
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

// ─── APT full profiles ────────────────────────────────────────────────────────

const APT_PROFILES: Record<string, string[]> = {
    'APT-29': [
        '╔════════════ THREAT ACTOR PROFILE ════════════╗',
        '  Designation: APT-29 | Cozy Bear | NOBELIUM',
        '  Nation-State: Russian Federation (SVR)',
        '  Active: 2008 – Present',
        '  Sectors: Government, Defence, Energy, Healthcare',
        '  Primary TTPs: T1566.001, T1078, T1027, T1071.001',
        '  Known Tools: SUNBURST, TEARDROP, BEATDROP, Cobalt Strike',
        '  Avg Dwell Time: 270+ days',
        '  Signature: Spear-phishing → OAuth abuse → supply chain implant',
        '╚══════════════════════════════════════════════╝',
    ],
    'APT-41': [
        '╔════════════ THREAT ACTOR PROFILE ════════════╗',
        '  Designation: APT-41 | Double Dragon | BARIUM',
        '  Nation-State: China (MSS-affiliated)',
        '  Active: 2012 – Present',
        '  Sectors: Technology, Gaming, Healthcare, Telecoms',
        '  Primary TTPs: T1190, T1059.003, T1021.002, T1041',
        '  Known Tools: DUSTPAN, KEYPLUG, SOGU, DEADEYE',
        '  Avg Dwell Time: 180+ days',
        '  Signature: Supply chain + espionage + financial crime hybrid',
        '╚══════════════════════════════════════════════╝',
    ],
    'LAZARUS': [
        '╔════════════ THREAT ACTOR PROFILE ════════════╗',
        '  Designation: Lazarus Group | HIDDEN COBRA',
        '  Nation-State: North Korea (RGB Bureau 121)',
        '  Active: 2009 – Present',
        '  Sectors: Finance, Crypto, Defence, Critical Infra',
        '  Primary TTPs: T1059.001, T1486, T1041, T1078',
        '  Known Tools: ELECTRICFISH, BANKSHOT, HOPLIGHT, WannaCry',
        '  Avg Dwell Time: 120+ days',
        '  Signature: Crypto heist + ransomware for revenue generation',
        '╚══════════════════════════════════════════════╝',
    ],
    'SANDWORM': [
        '╔════════════ THREAT ACTOR PROFILE ════════════╗',
        '  Designation: Sandworm | Voodoo Bear | IRIDIUM',
        '  Nation-State: Russia (GRU Unit 74455)',
        '  Active: 2014 – Present',
        '  Sectors: Critical Infrastructure, Energy, Government',
        '  Primary TTPs: T1561.002, T1486, T1071.004, T1498',
        '  Known Tools: NotPetya, Industroyer, BlackEnergy, Cyclops Blink',
        '  Avg Dwell Time: 90+ days',
        '  Signature: Destructive wiper/ICS attacks on national infrastructure',
        '╚══════════════════════════════════════════════╝',
    ],
    'DEFAULT': [
        '╔════════════ THREAT ACTOR PROFILE ════════════╗',
        '  No confirmed attribution data available.',
        '  Initiating inference from TTP fingerprint...',
        '  Closest match: UNKNOWN / MULTIPLE CLUSTERS',
        '  Recommendation: Initiate campaign correlation.',
        '╚══════════════════════════════════════════════╝',
    ],
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
    id: string;
    text: string;
    type: 'input' | 'output' | 'system' | 'error' | 'success' | 'separator';
    timestamp: string;
}

interface DiscoveredHost {
    ip: string;
    hostname?: string;
    os?: string;
    openPorts: { port: number; service: string; version?: string }[];
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    cves?: string[];
}

interface ActionTerminalProps {
    selectedNode: any | null;
    onExecuteAction: (action: string) => void;
}

// ─── Simulated discovery data ─────────────────────────────────────────────────

function generateMockHosts(target: string): DiscoveredHost[] {
    return [
        { ip: '10.0.1.10', hostname: 'dc-01.corp.local', os: 'Windows Server 2019', riskLevel: 'critical', openPorts: [{ port: 88, service: 'Kerberos' }, { port: 445, service: 'SMB', version: 'SMBv2' }, { port: 3389, service: 'RDP' }, { port: 389, service: 'LDAP' }], cves: ['CVE-2021-34527', 'CVE-2020-1472'] },
        { ip: '10.0.1.22', hostname: 'fileserver-01', os: 'Windows Server 2016', riskLevel: 'high', openPorts: [{ port: 445, service: 'SMB' }, { port: 2049, service: 'NFS' }, { port: 5985, service: 'WinRM' }], cves: ['CVE-2021-36942'] },
        { ip: '10.0.1.45', hostname: 'workstn-089', os: 'Windows 11 Pro', riskLevel: 'high', openPorts: [{ port: 135, service: 'MSRPC' }, { port: 445, service: 'SMB' }], cves: [] },
        { ip: '10.0.5.11', hostname: 'db-cluster-01', os: 'Ubuntu 22.04 LTS', riskLevel: 'critical', openPorts: [{ port: 5432, service: 'PostgreSQL' }, { port: 3306, service: 'MySQL' }, { port: 6379, service: 'Redis', version: 'unauthenticated' }, { port: 22, service: 'SSH', version: 'OpenSSH 8.9' }], cves: ['CVE-2022-0543'] },
        { ip: '192.168.1.105', hostname: 'dev-mac-ethan', os: 'macOS Sonoma', riskLevel: 'medium', openPorts: [{ port: 22, service: 'SSH' }, { port: 5000, service: 'Flask Dev Server' }] },
        { ip: '10.0.50.14', os: 'Embedded Linux', hostname: 'cam-r04', riskLevel: 'medium', openPorts: [{ port: 80, service: 'HTTP', version: 'Hikvision v2.1' }, { port: 554, service: 'RTSP' }] },
    ];
}

const RISK_CFG = {
    critical: { color: 'text-rose-400', bg: 'bg-rose-950/30', border: 'border-rose-700', dot: 'bg-rose-500' },
    high: { color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-700', dot: 'bg-orange-500' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-950/10', border: 'border-amber-700', dot: 'bg-amber-500' },
    low: { color: 'text-slate-400', bg: '', border: 'border-slate-700', dot: 'bg-slate-500' },
};

// ─── Help reference ───────────────────────────────────────────────────────────

const HELP_TEXT = [
    '╔══════════════════════════════════════════════════════╗',
    '║           NEXUS COMMAND REFERENCE v5.0              ║',
    '╚══════════════════════════════════════════════════════╝',
    '',
    '  RECONNAISSANCE & SCANNING',
    '  ─────────────────────────',
    '  SCAN --target <IP/CIDR>       Full network topology scan',
    '  SCAN --target <IP> --deep     CVE + service enumeration',
    '  SCAN --target <IP> --stealth  Low-and-slow, port 80/443 only',
    '  PORTS --host <IP>             Enumerate all open ports',
    '  CLUSTER --ip <IP>             Find coordinated attack cluster',
    '  GEOTRACK --ip <IP>            Geolocate + ASN attribution',
    '',
    '  OFFENSIVE OPERATIONS',
    '  ────────────────────',
    '  SPEAR-AEG <target>            Auto exploit generation (AEG)',
    '  EXPLOIT --cve <CVE-ID>        Weaponize specific vulnerability',
    '  INJECT --target <IP>          Memory-only payload injection',
    '  YARA-HUNT --target <IP>       Deploy YARA rule + live hunt',
    '',
    '  DEFENSIVE ACTIONS',
    '  ─────────────────',
    '  ISOLATE --node <ID>           Network-isolate target host',
    '  VACCINATE --target <IP>       Deploy live threat vaccine',
    '  YARA --generate <IOC>         Auto-generate + deploy YARA rule',
    '  HONEY-TRAP --ip <IP>          Redirect attacker to honeynet',
    '',
    '  INTELLIGENCE & ATTRIBUTION',
    '  ──────────────────────────',
    '  ENABLE_GHOST_PROTOCOL         Activate deception lattice',
    '  FORGE-PQC                     Generate post-quantum keys',
    '  ORACLE-PREDICT                Geopolitical threat forecast',
    '  INTEL --actor <APT>           Full actor profile (APT-29/41/LAZARUS/SANDWORM)',
    '  UEBA --entity <IP>            Behavioral baseline deviation report',
    '  CAMPAIGN --c2 <DOMAIN>        Map full attack campaign from C2 domain',
    '  DARKWEB --query <TERM>        Query dark web + paste feeds',
    '',
    '  MISSIONS',
    '  ────────',
    '  MISSION --launch <TARGET>     Launch async intelligence mission',
    '  MISSION --status              List all active missions',
    '  MISSION --abort <ID>          Abort and rollback a mission',
    '  TIMELINE --incident <ID>      Reconstruct kill-chain timeline',
    '',
    '  Type "help" to show this menu  |  ↑↓ for command history',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ActionTerminal: React.FC<ActionTerminalProps> = ({ selectedNode, onExecuteAction }) => {
    const [command, setCommand] = useState('');
    const [isDeceptionActive, setIsDeceptionActive] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);
    const [selectedHost, setSelectedHost] = useState<DiscoveredHost | null>(null);
    const [viewMode, setViewMode] = useState<'terminal' | 'topology'>('terminal');
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [activeMissions, setActiveMissions] = useState<{ id: string; target: string; status: string }[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: 'boot0', text: '╔═══════════════ NEXUS COMMAND CONSOLE ═══════════════╗', type: 'system', timestamp: '' },
        { id: 'boot1', text: '  OMNI-PROBE v5 | GOD MODE | FULL SPECTRUM CAPABILITY  ', type: 'system', timestamp: '' },
        { id: 'boot2', text: '╚═════════════════════════════════════════════════════╝', type: 'system', timestamp: '' },
        { id: 'boot3', text: '', type: 'output', timestamp: '' },
        { id: 'boot4', text: 'Nexus Terminal v5.0 — Type "help" for command reference', type: 'system', timestamp: '' },
        { id: 'boot5', text: 'Use ↑/↓ arrow keys to navigate command history.', type: 'output', timestamp: '' },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scanRef = useRef<any>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((text: string, type: LogEntry['type'] = 'output') => {
        setLogs(prev => [...prev, {
            id: `${Date.now()}-${Math.random()}`, text, type,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false })
        }]);
    }, []);

    const simulateOutput = useCallback((lines: string[], type: LogEntry['type'] = 'output', delayMs = 120) => {
        let i = 0;
        const iv = setInterval(() => {
            if (i < lines.length) {
                addLog(lines[i], type);
                i++;
            } else clearInterval(iv);
        }, delayMs);
    }, [addLog]);

    // Omni-Probe scan engine
    const runScan = useCallback(async (target: string, mode: 'full' | 'deep' | 'stealth' = 'full') => {
        setIsScanning(true);
        setScanProgress(0);
        setDiscoveredHosts([]);
        setViewMode('topology');

        addLog(`[OMNI-PROBE] Initializing scan engine — Target: ${target}`, 'system');
        addLog(`[*] Scan mode: ${mode.toUpperCase()} SPECTRUM`, 'system');
        addLog(`[*] ARP table poisoning to enumerate live hosts...`, 'output');

        const hosts = generateMockHosts(target);
        let p = 0;
        scanRef.current = setInterval(() => {
            p += Math.random() * 18 + 5;
            if (p >= 100) {
                p = 100;
                clearInterval(scanRef.current);
                setIsScanning(false);
            }
            setScanProgress(Math.min(100, p));
        }, 400);

        try {
            const res = await api.scanOmniProbe(target).catch(() => null);
            const finalHosts = res?.telemetry?.length ? res.telemetry.map((h: any) => ({
                ip: h.ip, openPorts: h.open_ports.map((p: any) => ({ port: p, service: 'Unknown' })),
                riskLevel: 'medium' as const,
            })) : hosts;

            hosts.forEach((host, i) => {
                setTimeout(() => {
                    addLog(`  [+] ${host.ip} ${host.hostname ? `(${host.hostname})` : ''} — ALIVE`, 'success');
                    addLog(`      OS: ${host.os || 'Unknown'} | Ports: ${host.openPorts.map(p => p.port).join(', ')}`, 'output');
                    if (host.cves?.length) addLog(`      ⚠ CVEs: ${host.cves.join(', ')}`, 'error');
                    setDiscoveredHosts(prev => [...prev, host]);
                }, i * 800 + 500);
            });

            setTimeout(() => {
                addLog(``, 'output');
                addLog(`[OMNI-PROBE] Scan complete — ${finalHosts.length} hosts discovered`, 'success');
                addLog(`[+] Critical: ${hosts.filter(h => h.riskLevel === 'critical').length}  High: ${hosts.filter(h => h.riskLevel === 'high').length}`, 'success');
                if (mode === 'deep') {
                    addLog(`[+] CVE matches: ${hosts.flatMap(h => h.cves || []).length} vulnerabilities indexed`, 'error');
                }
            }, hosts.length * 800 + 1200);

        } catch (e) {
            addLog(`[OMNI-PROBE] Using simulated topology (backend offline)`, 'system');
        }
    }, [addLog]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
            setHistoryIdx(nextIdx);
            setCommand(cmdHistory[nextIdx] ?? '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.max(historyIdx - 1, -1);
            setHistoryIdx(nextIdx);
            setCommand(nextIdx === -1 ? '' : cmdHistory[nextIdx] ?? '');
        }
    };

    const handleCommandSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = command.trim();
        if (!cmd) return;

        setCmdHistory(prev => [cmd, ...prev].slice(0, 50));
        setHistoryIdx(-1);
        addLog(`root@nexus:~# ${cmd}`, 'input');
        addLog('', 'output');
        onExecuteAction(cmd);
        setCommand('');

        const lower = cmd.toLowerCase();

        try {
            if (lower === 'help') {
                simulateOutput(HELP_TEXT, 'system', 20);

            } else if (lower.startsWith('scan')) {
                const target = cmd.match(/--target\s+(\S+)/)?.[1] || selectedNode?.id || '192.168.1.0/24';
                const mode = lower.includes('--deep') ? 'deep' : lower.includes('--stealth') ? 'stealth' : 'full';
                await runScan(target, mode);

            } else if (lower.startsWith('ports')) {
                const host = cmd.match(/--host\s+(\S+)/)?.[1] || selectedNode?.id || '127.0.0.1';
                addLog(`[OMNI-PROBE] Advanced port enumeration → ${host}`, 'system');
                simulateOutput([
                    `  80/tcp  open  http     nginx 1.24.0`,
                    `  443/tcp open  https    TLS 1.3`,
                    `  445/tcp open  microsoft-ds SMBv2`,
                    `  3389/tcp open  ms-wbt-server RDP`,
                    `  5985/tcp open  http     WinRM`,
                    `  6379/tcp open  redis    unauthenticated — ${'\x1b[31m'}CRITICAL${'\x1b[0m'}`,
                    ``,
                    `  6 ports open — 1 critical exposure (Redis unauthenticated)`,
                ], 'output', 150);

            } else if (lower.startsWith('exploit --cve')) {
                const cve = cmd.match(/--cve\s+(\S+)/)?.[1] || 'CVE-UNKNOWN';
                addLog(`[SPEAR] Weaponizing ${cve} for target ${selectedNode?.id || 'SELECTED TARGET'}`, 'system');
                simulateOutput([
                    `[*] Fetching PoC from exploit-db + NVD...`,
                    `[*] Adapting exploit to target architecture: x86_64`,
                    `[+] Shellcode generated — 412 bytes, AMSI bypass embedded`,
                    `[+] EDR evasion: custom PE header, code cave injection`,
                    `[+] Payload ready. Use: INJECT --target <IP> to deploy`,
                ], 'output', 200);

            } else if (lower.startsWith('inject')) {
                const target = cmd.match(/--target\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[GHOST-SHELL] Memory-only injection → ${target}`, 'system');
                simulateOutput([
                    `[*] Establishing HTTPS C2 channel (port 443)...`,
                    `[*] Bypassing AppLocker via WMIC LOLBin...`,
                    `[*] Allocating RWX memory region in svchost.exe PID 1234`,
                    `[*] Writing shellcode to process memory...`,
                    `[+] Injected via process hollowing — no file on disk`,
                    `[+] Beacon established from ${target}. Uplink active.`,
                ], 'output', 250);

            } else if (lower.startsWith('isolate')) {
                const node = cmd.match(/--node\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[NEXUS-SOAR] Isolation protocol → ${node}`, 'system');
                const res = await api.quarantineNode(node).catch(() => ({ target: node, message: 'Isolation applied (simulated)' }));
                simulateOutput([
                    `[*] Querying NGFW API...`,
                    `[*] Applying DROP ACL: src ${res.target} — all ports`,
                    `[*] Revoking switch VLAN membership on port 0/14`,
                    `[+] Host ${res.target} completely isolated`,
                    `[!] ${res.message}`,
                    `[*] Forensic memory dump queued...`,
                ], 'system', 180);

            } else if (lower.startsWith('vaccinate')) {
                const target = cmd.match(/--target\s+(\S+)/)?.[1] || 'ALL_ENDPOINTS';
                addLog(`[VACCINE] Deploying live threat countermeasure → ${target}`, 'system');
                simulateOutput([
                    `[*] Generating behavioral signature from active IOC...`,
                    `[*] Compiling vaccine module: NEXUS_VAX_${Date.now().toString(36).toUpperCase()}`,
                    `[+] Distributing via Hive-Mind agent mesh (47 nodes)`,
                    `[+] Vaccine deployed. Neutralization rate: 99.3%`,
                ], 'success', 200);

            } else if (lower.startsWith('yara')) {
                const ioc = cmd.match(/--generate\s+(.+)/)?.[1] || 'behavioral_ioc';
                addLog(`[SENTINEL] Auto-generating YARA rule from: ${ioc}`, 'system');
                simulateOutput([
                    `rule NEXUS_IOC_${Date.now().toString(36).toUpperCase()} {`,
                    `  meta:`,
                    `    description = "Auto-generated from behavioral IOC"`,
                    `    threat_actor = "UNKNOWN"`,
                    `    confidence = 94`,
                    `  strings:`,
                    `    $s1 = { 4D 5A 90 00 03 00 00 00 }  // MZ header`,
                    `    $s2 = "CreateRemoteThread" ascii`,
                    `    $s3 = "VirtualAllocEx" ascii wide`,
                    `  condition:`,
                    `    all of them and pe.is_pe`,
                    `}`,
                    ``,
                    `[+] Rule compiled. Deployed to 247 endpoints via Hive-Mind.`,
                ], 'output', 100);

            } else if (lower.startsWith('honey-trap')) {
                const ip = cmd.match(/--ip\s+(\S+)/)?.[1] || selectedNode?.id || 'ATTACKER';
                addLog(`[GHOST] Routing ${ip} into deception lattice...`, 'system');
                simulateOutput([
                    `[*] ARP spoofing attacker gateway...`,
                    `[*] Spinning up Ghost Protocol honeypot cluster...`,
                    `[+] Attacker ${ip} now routed to honeynet 10.0.99.0/24`,
                    `[+] Credential lures active on SMB/RDP/SSH`,
                    `[+] Attribution capture enabled — keylogging active`,
                ], 'system', 200);

            } else if (lower.startsWith('intel --actor')) {
                const actor = (cmd.match(/--actor\s+(.+)/)?.[1] || 'APT-41').toUpperCase().replace(/ /g, '-');
                const profile = APT_PROFILES[actor] || APT_PROFILES['DEFAULT'];
                simulateOutput(profile, 'system', 60);

            } else if (lower.startsWith('spear-aeg') || lower.startsWith('spear')) {
                addLog(`[TIER 5 — THE SPEAR] AEG sequence initiated`, 'error');
                const res = await api.synthesizeExploit({ ip: selectedNode?.id || 'TARGET', target_cve: 'AUTO-DETECT' }).catch(() => null);
                simulateOutput([
                    `[*] Profiling target attack surface...`,
                    `[*] AI swarm analyzing 142,000 CVE records...`,
                    `[+] Match: CVE-2021-34527 (CVSS 8.8) — PrintNightmare`,
                    `[+] EDR evasion probability: ${res?.weaponized_package?.evasion_probability ?? '94.2'}%`,
                    `[+] Shellcode: ${res?.weaponized_package?.size_bytes ?? '412'} bytes, polymorphic`,
                    `[+] Payload staged via Ghost Protocol. Awaiting callback...`,
                ], 'error', 220);

            } else if (lower.startsWith('forge-pqc')) {
                addLog(`[FORGE] Generating Post-Quantum Cryptographic keypair`, 'system');
                const res = await api.generatePQCKeys().catch(() => null);
                simulateOutput([
                    `[*] Lattice-based cryptography engine loading...`,
                    `[*] Generating Kyber-1024 KEM keys (NIST PQC Standard)...`,
                    `[+] PUB: PQC-${res?.public_key_hash ?? Math.random().toString(36).substring(2, 14).toUpperCase()}`,
                    `[+] Quantum-safe C2 channels established on all agents`,
                ], 'system', 250);

            } else if (lower.startsWith('oracle-predict')) {
                addLog(`[ORACLE] Threat prediction engine — geo-intelligence active`, 'system');
                const res = await api.predictThreats().catch(() => null);
                const prob = ((res?.predictions?.[0]?.threat_probability ?? 0.847) * 100).toFixed(1);
                simulateOutput([
                    `[*] Correlating dark web chatter (TOR + I2P feeds)...`,
                    `[*] Cross-referencing physical troop movements + SIGINT...`,
                    `[!] PREDICTION: ${prob}% probability of nation-state offensive in 72h`,
                    `[!] Likely actor: ${res?.predictions?.[0]?.actor ?? 'APT-41 (Winnti cluster)'}`,
                    `[*] Recommended posture: ELEVATED — enforce ZTA`,
                ], 'error', 220);

            } else if (lower.startsWith('ueba --entity')) {
                const entity = cmd.match(/--entity\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[UEBA] Behavioral analysis → ${entity}`, 'system');
                simulateOutput([
                    `[*] Fetching 90-day baseline for ${entity}...`,
                    `[*] Sliding window: last 100 events (σ = 2.4)`,
                    `[+] Auth failures: 48/hr [baseline: 2/hr] — ANOMALOUS (+2400%)`,
                    `[+] Payload size:  4.2MB avg [baseline: 0.8MB] — ANOMALOUS (+425%)`,
                    `[+] Port scan rate: 312 ports/min [baseline: 0] — CRITICAL`,
                    `[+] Sequential anomaly chain: 4 events in 9 min — BREACH DETECTED`,
                    `[!] MITRE mapping: T1110 (Brute Force), T1046 (Network Discovery)`,
                    `[!] Kill-chain stage inferred: CREDENTIAL ACCESS → DISCOVERY`,
                    `[!] Confidence: 94.3% (upper CI: 48 auth/hr > baseline 6)`,
                ], 'error', 180);

            } else if (lower.startsWith('campaign --c2')) {
                const domain = cmd.match(/--c2\s+(\S+)/)?.[1] || 'c2.unknown.net';
                addLog(`[CAMPAIGN] Mapping attack campaign from C2: ${domain}`, 'system');
                simulateOutput([
                    `[*] Querying Neo4j for all IPs → ${domain}...`,
                    `[*] Graph traversal — depth 3...`,
                    `[+] Attribution cluster: 14 IPs share this C2 infrastructure`,
                    `[+] Victim assets targeted: 7 internal hosts across 2 subnets`,
                    `[+] Campaign duration: 23 days (first seen: 2026-02-11)`,
                    `[+] TTP fingerprint matches: APT-41 (BARIUM cluster)`,
                    `[+] Recommended: ISOLATE all 14 IPs + HONEY-TRAP C2 domain`,
                ], 'success', 200);

            } else if (lower.startsWith('geotrack --ip')) {
                const ip = cmd.match(/--ip\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[GEOTRACK] Geolocation + ASN attribution → ${ip}`, 'system');
                simulateOutput([
                    `[+] Country: Russian Federation (RU)`,
                    `[+] City: St. Petersburg (59.93°N, 30.36°E)`,
                    `[+] ASN: AS4134 | Chinanet | Hosting/VPS`,
                    `[+] Tor Exit Node: YES | Anonymous Proxy: YES`,
                    `[+] JA3 fingerprint: a0e9f5d64349fb13191bc781f81f42e1 — KNOWN MALWARE`,
                    `[+] First seen malicious: 2025-11-14 | AbuseIPDB score: 94/100`,
                    `[!] Verdict: HOSTILE — Nation-state infrastructure (Confidence: 91%)`,
                ], 'error', 160);

            } else if (lower.startsWith('cluster --ip')) {
                const ip = cmd.match(/--ip\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[CLUSTER] Finding coordinated attack cluster for ${ip}`, 'system');
                simulateOutput([
                    `[*] Querying co-targeting graph (shared victim assets)...`,
                    `[+] Cluster size: 14 sibling IPs (shared 6 internal targets)`,
                    `[+] Sibling #1: 185.220.101.47 — shared 6 targets (score: 100)`,
                    `[+] Sibling #2: 185.220.101.48 — shared 5 targets (score: 83)`,
                    `[+] Sibling #3: 91.108.4.10   — shared 4 targets (score: 67)`,
                    `[+] Coordinated attack pattern: CONFIRMED (14 IPs, same ASN)`,
                    `[!] Botnet signature: Mirai variant (IDS match: 98.7%)`,
                ], 'output', 170);

            } else if (lower.startsWith('timeline --incident')) {
                const id = cmd.match(/--incident\s+(\S+)/)?.[1] || 'INC-001';
                addLog(`[TIMELINE] Reconstructing kill-chain for incident ${id}`, 'system');
                simulateOutput([
                    `[+] Phase 1: INITIAL ACCESS    — 185.220.101.45 → VPN (T1078)`,
                    `[+] Phase 2: EXECUTION         — WORKSTN-089: PowerShell LOLBin (T1059.001)`,
                    `[+] Phase 3: PERSISTENCE       — Registry Run key: svchst.exe (T1547.001)`,
                    `[+] Phase 4: PRIV ESCALATION   — Token impersonation → SYSTEM (T1134)`,
                    `[+] Phase 5: CRED ACCESS       — LSASS dump via Mimikatz (T1003.001)`,
                    `[+] Phase 6: LATERAL MOVEMENT  — Pass-the-hash: 10.0.1.45→10.0.1.10 (T1550)`,
                    `[+] Phase 7: EXFILTRATION      — 2.3GB upload → 45.33.22.11 (T1041)`,
                    `[!] Full kill-chain confirmed. 7 MITRE phases in 47 minutes.`,
                ], 'error', 130);

            } else if (lower.startsWith('yara-hunt --target')) {
                const target = cmd.match(/--target\s+(\S+)/)?.[1] || 'ALL_ENDPOINTS';
                addLog(`[YARA-HUNT] Deploying YARA hunt on ${target}`, 'system');
                simulateOutput([
                    `[*] Loading YARA ruleset (247 rules, Tier-2 intelligence)...`,
                    `[*] Initiating distributed hunt via Hive-Mind agent mesh...`,
                    `[+] Agent coverage: 47/47 nodes online`,
                    `[+] Scanning: 2,341,892 files across target`,
                    `[+] MATCH: \\WORKSTN-089\\TEMP\\svchst.exe → Rule: NEXUS_COBALT_STRIKE_BEACON`,
                    `[+] MATCH: \\DB-CLUSTER-01\\proc\\python3 → Rule: NEXUS_XORDDOS_DROPPER`,
                    `[!] 2 live threats detected. Quarantine? → VACCINATE --target ${target}`,
                ], 'error', 180);

            } else if (lower.startsWith('darkweb --query')) {
                const query = cmd.match(/--query\s+(.+)/)?.[1] || 'corp.local credentials';
                addLog(`[DARKWEB] Querying TOR paste feeds + markets: "${query}"`, 'system');
                simulateOutput([
                    `[*] Connecting via Tor circuit (3 hops)...`,
                    `[*] Querying: RaidForums mirror, BreachForums, I2P pastes...`,
                    `[+] Hit #1: Pastebin TOR — 1,240 credentials leaked (corp.local domain)`,
                    `[+] Hit #2: BreachForums — VPN hash dump, 340 NTLM hashes`,
                    `[+] Hit #3: Telegram channel — Ransomware gang claims attack on tenant`,
                    `[!] Credential exposure CONFIRMED. Enforce mandatory password reset.`,
                    `[!] Recommend: FORGE-PQC for all privileged accounts immediately.`,
                ], 'error', 210);

            } else if (lower.startsWith('mission --launch')) {
                const target = cmd.match(/--launch\s+(\S+)/)?.[1] || selectedNode?.id || 'UNKNOWN';
                addLog(`[MISSION] Launching intelligence mission → ${target}`, 'system');
                const missionId = `MSN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
                setActiveMissions(prev => [...prev, { id: missionId, target, status: 'RUNNING' }]);
                simulateOutput([
                    `[*] Mission ID: ${missionId}`,
                    `[*] Phase 1: RECON      — Initiating Omni-Probe scan...`,
                    `[*] Phase 2: CORRELATE  — Graph proximity traversal...`,
                    `[*] Phase 3: ANALYZE    — UEBA + anomaly scoring...`,
                    `[*] Phase 4: ENRICH     — APT attribution + TLS fingerprint...`,
                    `[+] Mission ${missionId} running in background.`,
                    `[+] Use: MISSION --status  to check progress.`,
                ], 'success', 200);

            } else if (lower.startsWith('mission --status')) {
                if (activeMissions.length === 0) {
                    addLog('[MISSION] No active missions. Use: MISSION --launch <target>', 'output');
                } else {
                    simulateOutput([
                        '  ID              TARGET          STATUS',
                        '  ─────────────── ─────────────── ──────',
                        ...activeMissions.map(m => `  ${m.id.padEnd(15)} ${m.target.slice(0, 15).padEnd(15)} ${m.status}`),
                    ], 'system', 50);
                }

            } else if (lower.startsWith('mission --abort')) {
                const id = cmd.match(/--abort\s+(\S+)/)?.[1];
                if (!id) { addLog('[MISSION] Usage: MISSION --abort <MISSION_ID>', 'error'); }
                else {
                    setActiveMissions(prev => prev.map(m => m.id === id ? { ...m, status: 'ABORTED' } : m));
                    simulateOutput([
                        `[MISSION] Aborting ${id}...`,
                        `[+] Reversible actions rolled back.`,
                        `[+] Mission ${id}: ABORTED`,
                    ], 'system', 150);
                }

            } else if (lower.startsWith('enable_ghost')) {
                setIsDeceptionActive(true);
                addLog(`[GHOST] Deceptive Lattice ACTIVATED`, 'system');
                simulateOutput([
                    `[*] Ghost honeypot cluster coming online...`,
                    `[+] 15 fake endpoints seeded in DMZ`,
                    `[+] Credential lures deployed on LDAP, SMB, RDP`,
                    `[+] All attacker interactions now captured + correlated`,
                ], 'system', 180);

            } else if (lower.startsWith('disable_ghost')) {
                setIsDeceptionActive(false);
                simulateOutput(['[GHOST] Deceptive Lattice deactivated.'], 'output');

            } else if (lower === 'clear') {
                setLogs([]);

            } else {
                simulateOutput([
                    `Command not recognized: "${cmd.split(' ')[0]}"`,
                    `Type "help" for available commands.`,
                ], 'error');
            }

        } catch (err: any) {
            addLog(`[NEXUS] Fatal error: ${err.message}`, 'error');
        }
    };

    const logColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'input': return 'text-emerald-400 font-bold';
            case 'system': return 'text-cyan-400';
            case 'error': return 'text-rose-400';
            case 'success': return 'text-emerald-400';
            case 'separator': return 'text-slate-700 border-t border-slate-800 mt-1 pt-1';
            default: return 'text-slate-300';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#040507] border-l border-slate-900 font-mono relative overflow-hidden">
            {/* Scanline */}
            <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.04] bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_3px]" />

            {/* Header */}
            <div className="px-3 py-2.5 border-b border-emerald-900/30 bg-black/70 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Terminal size={13} className="text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400 tracking-widest">NEXUS COMMAND CONSOLE</span>
                    {isDeceptionActive && (
                        <span className="text-[8px] bg-purple-950/60 border border-purple-600 text-purple-400 px-1.5 py-0.5 rounded font-bold animate-pulse">GHOST ACTIVE</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex rounded overflow-hidden border border-slate-800">
                        <button onClick={() => setViewMode('terminal')}
                            className={clsx("text-[8px] px-2 py-1 font-bold transition-colors", viewMode === 'terminal' ? "bg-emerald-950 text-emerald-400" : "text-slate-600 hover:text-slate-400")}>
                            TERM
                        </button>
                        <button onClick={() => setViewMode('topology')}
                            className={clsx("text-[8px] px-2 py-1 font-bold transition-colors border-l border-slate-800", viewMode === 'topology' ? "bg-cyan-950 text-cyan-400" : "text-slate-600 hover:text-slate-400")}>
                            TOPO
                        </button>
                    </div>
                    <span className="text-[8px] text-slate-700">[ROOT@NEXUS]</span>
                </div>
            </div>

            {/* Scan progress bar */}
            {isScanning && (
                <div className="shrink-0 px-3 py-1.5 bg-black/60 border-b border-cyan-900/30">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-cyan-400 flex items-center gap-1.5"><Radar size={10} className="animate-spin" /> OMNI-PROBE SCANNING</span>
                        <span className="text-[9px] text-cyan-500 font-mono">{Math.round(scanProgress)}%</span>
                    </div>
                    <div className="h-0.5 bg-slate-900 rounded overflow-hidden">
                        <div className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]" style={{ width: `${scanProgress}%` }} />
                    </div>
                </div>
            )}

            {/* Main content area */}
            <div className="flex-1 min-h-0 overflow-hidden">

                {viewMode === 'terminal' ? (
                    // ── Terminal log view ──
                    <div ref={scrollRef} className="h-full overflow-y-auto custom-scrollbar px-3 py-2 space-y-0.5 text-[10px]">
                        {logs.map(log => (
                            <div key={log.id} className={clsx("flex gap-2 items-start break-words whitespace-pre-wrap leading-relaxed", logColor(log.type))}>
                                {log.timestamp && <span className="text-[8px] text-slate-800 shrink-0 mt-0.5 select-none">[{log.timestamp}]</span>}
                                <span className="flex-1 min-w-0">{log.text}</span>
                            </div>
                        ))}
                        {/* Quick command chips */}
                        {discoveredHosts.length > 0 && (
                            <div className="pt-2 pb-1">
                                <p className="text-[8px] text-slate-700 mb-1">QUICK ACTIONS:</p>
                                <div className="flex flex-wrap gap-1">
                                    {discoveredHosts.filter(h => h.riskLevel === 'critical' || h.riskLevel === 'high').map(h => (
                                        <button key={h.ip} onClick={() => setCommand(`ISOLATE --node ${h.ip}`)}
                                            className="text-[8px] border border-rose-900/50 text-rose-500 px-1.5 py-0.5 rounded hover:bg-rose-950/30 transition-colors">
                                            ISOLATE {h.ip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // ── Topology view ──
                    <div className="h-full overflow-y-auto custom-scrollbar p-2">
                        {discoveredHosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
                                <Radar size={24} />
                                <p className="text-[10px] tracking-widest text-center">Run SCAN to discover hosts</p>
                                <button onClick={() => { setViewMode('terminal'); setCommand('SCAN --target 10.0.0.0/24'); inputRef.current?.focus(); }}
                                    className="text-[9px] border border-cyan-800 text-cyan-500 px-3 py-1.5 rounded hover:bg-cyan-950/30 transition-colors mt-1">
                                    LAUNCH SCAN
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-1 mb-2">
                                    {[
                                        { label: 'HOSTS', value: discoveredHosts.length, color: 'text-cyan-400' },
                                        { label: 'CRITICAL', value: discoveredHosts.filter(h => h.riskLevel === 'critical').length, color: 'text-rose-400' },
                                        { label: 'HIGH', value: discoveredHosts.filter(h => h.riskLevel === 'high').length, color: 'text-orange-400' },
                                        { label: 'CVEs', value: discoveredHosts.flatMap(h => h.cves || []).length, color: 'text-amber-400' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-black/60 border border-slate-800 rounded p-1.5 text-center">
                                            <div className={clsx("text-sm font-bold", s.color)}>{s.value}</div>
                                            <div className="text-[7px] text-slate-700">{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Host cards */}
                                {discoveredHosts.map(host => {
                                    const cfg = RISK_CFG[host.riskLevel];
                                    const isSelected = selectedHost?.ip === host.ip;
                                    return (
                                        <div key={host.ip} onClick={() => setSelectedHost(isSelected ? null : host)}
                                            className={clsx("rounded border p-2 cursor-pointer transition-all", cfg.border, isSelected ? cfg.bg : "bg-black/40 hover:bg-black/60")}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                                                <span className="text-[10px] font-bold font-mono text-white">{host.ip}</span>
                                                <span className={clsx("ml-auto text-[8px] font-bold px-1 rounded", cfg.color)}>{host.riskLevel.toUpperCase()}</span>
                                            </div>
                                            {host.hostname && <p className="text-[9px] text-slate-500 mb-0.5">{host.hostname}</p>}
                                            <div className="flex flex-wrap gap-1">
                                                {host.openPorts.slice(0, 4).map(p => (
                                                    <span key={p.port} className={clsx("text-[7px] border px-1 rounded", p.service === 'Redis' && p.version?.includes('unauth') ? "border-rose-700 text-rose-400" : "border-slate-700 text-slate-500")}>
                                                        {p.port}/{p.service}
                                                    </span>
                                                ))}
                                                {host.openPorts.length > 4 && <span className="text-[7px] text-slate-700">+{host.openPorts.length - 4}</span>}
                                            </div>
                                            {isSelected && (
                                                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                                                    {host.os && <p className="text-[9px] text-slate-500">OS: <span className="text-slate-300">{host.os}</span></p>}
                                                    {host.cves?.length ? (
                                                        <div>
                                                            <p className="text-[8px] text-rose-500 font-bold mb-0.5">CVEs:</p>
                                                            {host.cves.map(c => (
                                                                <div key={c} className="text-[8px] text-rose-400 pl-2">• {c}</div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    <div className="flex gap-1 pt-1">
                                                        <button onClick={e => { e.stopPropagation(); setCommand(`ISOLATE --node ${host.ip}`); setViewMode('terminal'); }}
                                                            className="text-[8px] border border-rose-800 text-rose-500 px-2 py-0.5 rounded hover:bg-rose-950/30">ISOLATE</button>
                                                        <button onClick={e => { e.stopPropagation(); setCommand(`INJECT --target ${host.ip}`); setViewMode('terminal'); }}
                                                            className="text-[8px] border border-amber-800 text-amber-500 px-2 py-0.5 rounded hover:bg-amber-950/30">INJECT</button>
                                                        <button onClick={e => { e.stopPropagation(); setCommand(`VACCINATE --target ${host.ip}`); setViewMode('terminal'); }}
                                                            className="text-[8px] border border-emerald-800 text-emerald-500 px-2 py-0.5 rounded hover:bg-emerald-950/30">VACCINE</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick action buttons */}
            {selectedNode && (
                <div className="border-t border-slate-900 bg-black/50 px-2 py-1.5 shrink-0">
                    <p className="text-[7px] text-slate-700 mb-1">TARGET: <span className="text-cyan-600">{selectedNode.id}</span></p>
                    <div className="grid grid-cols-3 gap-1">
                        {[
                            { label: 'SCAN', cmd: `SCAN --target ${selectedNode.id}`, color: 'text-cyan-400 border-cyan-900 hover:border-cyan-600' },
                            { label: 'ISOLATE', cmd: `ISOLATE --node ${selectedNode.id}`, color: 'text-rose-400 border-rose-900 hover:border-rose-600' },
                            { label: 'INJECT', cmd: `INJECT --target ${selectedNode.id}`, color: 'text-amber-400 border-amber-900 hover:border-amber-600' },
                            { label: 'YARA', cmd: `YARA --generate ${selectedNode.id}_ioc`, color: 'text-purple-400 border-purple-900 hover:border-purple-600' },
                            { label: 'VACCINE', cmd: `VACCINATE --target ${selectedNode.id}`, color: 'text-emerald-400 border-emerald-900 hover:border-emerald-600' },
                            { label: 'AEG', cmd: `SPEAR-AEG ${selectedNode.id}`, color: 'text-red-400 border-red-900 hover:border-red-600' },
                        ].map(btn => (
                            <button key={btn.label} onClick={() => setCommand(btn.cmd)}
                                className={clsx("text-[8px] font-bold py-1 border rounded transition-colors bg-black/60", btn.color)}>
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Mission status bar */}
            {activeMissions.filter(m => m.status === 'RUNNING').length > 0 && (
                <div className="border-t border-purple-900/30 bg-black/50 px-3 py-1 shrink-0 flex items-center gap-2">
                    <Crosshair size={8} className="text-purple-500 animate-pulse shrink-0" />
                    <span className="text-[8px] text-purple-500 font-bold">MISSIONS ACTIVE:</span>
                    {activeMissions.filter(m => m.status === 'RUNNING').map(m => (
                        <span key={m.id} className="text-[7px] bg-purple-950/40 border border-purple-800 text-purple-400 px-1.5 py-0.5 rounded">
                            {m.id} → {m.target}
                        </span>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="border-t border-emerald-900/20 bg-black/80 px-3 py-2 z-10 shrink-0">
                <form onSubmit={handleCommandSubmit} className="flex items-center gap-2">
                    <span className="text-emerald-500 text-[11px] font-bold shrink-0">root@nexus:~#</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={command}
                        onChange={e => setCommand(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent outline-none text-emerald-400 text-[11px] placeholder-slate-800 caret-emerald-500"
                        placeholder='type "help" or ↑↓ history...'
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {cmdHistory.length > 0 && (
                        <span className="text-[7px] text-slate-800 shrink-0">{cmdHistory.length} cmds</span>
                    )}
                </form>
            </div>
        </div>
    );
};
