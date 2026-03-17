import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    BrainCircuit, Loader2, Sparkles, Send, Shield, AlertTriangle,
    Zap, Target, Eye, RefreshCw, ChevronRight, TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: 'user' | 'advisor';
    content: string;
    ts: string;
    category?: 'brief' | 'recommend' | 'alert' | 'analysis';
}

// ─── AI Response Templates ────────────────────────────────────────────────────

const AUTO_BRIEFS = [
    {
        category: 'alert' as const,
        content: "🔴 **CRITICAL INTELLIGENCE BRIEF [AUTO-GENERATED]**\n\nCorrelation engine has identified a high-confidence (96.4%) attack chain:\n\n1. **T1566.001** — Spearphishing lure delivered to 3 financial staff\n2. **T1055** — Process injection into `WmiPrvSE.exe` via macro execution\n3. **T1003.001** — LSASS memory access on DC-01 detected (Mimikatz IOC)\n\n⚠️ **Dwell time estimated**: 4-8 hours\n**Recommended immediate action**: Invoke CREDENTIAL_INVALIDATION playbook and isolate DC-01 from AD replication."
    },
    {
        category: 'recommend' as const,
        content: "⚡ **PROACTIVE THREAT HUNTING RECOMMENDATION**\n\nBased on DNS telemetry anomaly (ANM-9022), I recommend immediately:\n\n- **Query**: `event_id:4768 AND dst_port:88 AND NOT known_controllers` — detect Kerberoasting\n- **Hunt**: Search for `CreateRemoteThread` calls into `lsass.exe` across all Windows endpoints\n- **Block**: Add threat intel IOC `185.220.101.45` to NGFW deny list — Cobalt Strike beacon confirmed\n\nConfidence: **94.1%** — Evidence: DNS entropy, TXT query abuse, lateral SMB chain"
    },
    {
        category: 'analysis' as const,
        content: "📊 **SECURITY POSTURE ANALYSIS — CURRENT THREAT LANDSCAPE**\n\n| Metric | Value | Trend |\n|--------|-------|-------|\n| Attack Surface Score | 67/100 | ↑ High Risk |\n| Mean Time to Detect | 4m 12s | ✓ Below threshold |\n| Unpatched CVEs (Critical) | 3 | ⚠️ Action needed |\n| Zero-Trust Compliance | 84% | → Stable |\n\n**Top Risk Factors**:\n• `CVE-2021-34527` (PrintNightmare) — unpatched on 4 servers\n• RDP exposed on 3 internet-facing hosts (ports 3389)\n• 22 service accounts with non-expiring passwords"
    },
];

const CANNED_RESPONSES: Record<string, string> = {
    default: "I'm analyzing your query against current threat intelligence and system telemetry...\n\nBased on available data, I recommend:\n\n1. **Immediate**: Review the anomaly queue for high-confidence (>90%) detections\n2. **Short-term**: Rotate all service account credentials flagged in the UEBA baseline deviation alerts\n3. **Strategic**: Consider implementing deception lattice (Ghost Protocol) on the VLAN 10 segment where the low-and-slow recon was detected\n\nWould you like me to generate a specific playbook for any of these?",
    isolate: "**HOST ISOLATION ANALYSIS**\n\nFor isolating `{target}`, I recommend the following steps:\n\n1. **Pre-isolation**: Capture volatile memory (RAM dump) before cutting network — forensic value\n2. **Network isolation**: Apply iptables DROP rule, revoke switch port VLAN membership\n3. **Account lockout**: Disable associated service accounts in AD\n4. **Evidence preservation**: Forward all logs to SIEM before isolation completes\n\n⚠️ Warning: Isolating DC-01 will disrupt AD authentication. Coordinate with IT ops first.\n\nExecute via Blue Team SOC → NETWORK ISOLATION playbook.",
    scan: "**RECONNAISSANCE RECOMMENDATIONS**\n\nFor the target range, I recommend a **staged scanning approach**:\n\n1. **Stage 1** — Passive fingerprinting: Shodan/Censys lookups (zero network touch)\n2. **Stage 2** — Stealth SYN scan via Omni-Probe (low TTL, 1-second jitter)\n3. **Stage 3** — Service enumeration on discovered open ports\n\nPrioritize scanning:\n- **Port 445** (SMB) — lateral movement vector\n- **Port 3389** (RDP) — credential brute-force target\n- **Port 6379** (Redis) — common unauth exposure\n\nLaunch via Omni-Probe → STEALTH mode.",
    report: "**EXECUTIVE THREAT BRIEFING — {date}**\n\n🔴 **Critical Findings (Last 24h)**:\n• 1 ransomware pre-detonation event — contained\n• 3 credential dumping attempts on domain controllers\n• 14.7GB suspicious outbound data transfer — under investigation\n\n🟡 **Ongoing Investigations**:\n• DNS tunneling C2 channel — source: 10.0.1.22\n• Impossible travel anomaly — admin@corp.com\n\n✅ **Defensive Actions Taken**:\n• 8 YARA rules deployed via Sentinel Catalyst\n• 2 hosts isolated via NEXUS-SOAR\n• Hive-Mind vaccine distributed to 47 nodes\n\n**Overall Risk Rating: HIGH → Trending toward MEDIUM**",
    mitre: "**MITRE ATT&CK FRAMEWORK COVERAGE ANALYSIS**\n\nBased on current telemetry, the following tactics have been observed:\n\n| Tactic | Technique | Confidence | Status |\n|--------|-----------|------------|--------|\n| Persistence | T1053.005 (Sched. Task) | 88% | ACTIVE |\n| Credential Access | T1003.001 (LSASS Dump) | 96% | CONTAINED |\n| Lateral Movement | T1021.002 (SMB/PtH) | 84% | MONITORING |\n| Exfiltration | T1041 (C2 Channel) | 91% | BLOCKED |\n| C2 | T1071.004 (DNS Tunneling) | 97% | INVESTIGATING |\n\n**Coverage Gaps**: T1195 (Supply Chain), T1190 (Exploit Public-Facing App) not currently monitored.",
};

const PROMPT_STARTERS = [
    { label: 'Daily Threat Brief', q: 'Generate a full threat intelligence report for today', icon: <TrendingUp size={11} /> },
    { label: 'MITRE Coverage', q: 'Analyze our MITRE ATT&CK coverage gaps', icon: <Target size={11} /> },
    { label: 'Isolation Guidance', q: 'How should I isolate the compromised host DC-01?', icon: <Shield size={11} /> },
    { label: 'Hunt Recommendations', q: 'What threat hunts should I run based on current anomalies?', icon: <Eye size={11} /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface AIAdvisorPanelProps {
    insight?: string;
    isGenerating?: boolean;
}

export const AIAdvisorPanel: React.FC<AIAdvisorPanelProps> = ({ insight, isGenerating = false }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [briefIdx, setBriefIdx] = useState(0);
    const chatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, thinking]);

    // Auto-inject threat brief on mount
    useEffect(() => {
        const brief = AUTO_BRIEFS[0];
        setTimeout(() => {
            setMessages([{
                id: 'init',
                role: 'advisor',
                content: brief.content,
                ts: new Date().toLocaleTimeString(),
                category: brief.category,
            }]);
        }, 800);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        const userMsg: Message = { id: `u${Date.now()}`, role: 'user', content: text, ts: new Date().toLocaleTimeString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setThinking(true);

        await new Promise(res => setTimeout(res, 1200 + Math.random() * 1000));

        // Determine response
        const lower = text.toLowerCase();
        let response = CANNED_RESPONSES.default;
        let category: Message['category'] = 'analysis';

        if (lower.includes('isolat') || lower.includes('contain')) {
            response = CANNED_RESPONSES.isolate.replace('{target}', 'DC-01');
            category = 'recommend';
        } else if (lower.includes('scan') || lower.includes('recon')) {
            response = CANNED_RESPONSES.scan;
            category = 'recommend';
        } else if (lower.includes('report') || lower.includes('brief') || lower.includes('summary')) {
            response = CANNED_RESPONSES.report.replace('{date}', new Date().toLocaleDateString());
            category = 'brief';
        } else if (lower.includes('mitre') || lower.includes('attack') || lower.includes('technique')) {
            response = CANNED_RESPONSES.mitre;
            category = 'analysis';
        } else if (lower.includes('hunt') || lower.includes('threat')) {
            response = CANNED_RESPONSES[insight ? 'recommend' : 'default'];
            category = 'recommend';
        }

        const advisorMsg: Message = { id: `a${Date.now()}`, role: 'advisor', content: response, ts: new Date().toLocaleTimeString(), category };
        setThinking(false);
        setMessages(prev => [...prev, advisorMsg]);
    }, [insight]);

    const injectBrief = () => {
        const brief = AUTO_BRIEFS[(briefIdx + 1) % AUTO_BRIEFS.length];
        setBriefIdx(i => (i + 1) % AUTO_BRIEFS.length);
        const msg: Message = { id: `brief${Date.now()}`, role: 'advisor', content: brief.content, ts: new Date().toLocaleTimeString(), category: brief.category };
        setMessages(prev => [...prev, msg]);
    };

    const categoryConfig = {
        alert: { border: 'border-rose-800', bg: 'bg-rose-950/20', label: 'CRITICAL ALERT' },
        recommend: { border: 'border-amber-800', bg: 'bg-amber-950/20', label: 'RECOMMENDATION' },
        brief: { border: 'border-indigo-800', bg: 'bg-indigo-950/20', label: 'INTEL BRIEF' },
        analysis: { border: 'border-cyan-800', bg: 'bg-cyan-950/10', label: 'ANALYSIS' },
    };

    return (
        <div className="flex flex-col h-full bg-black/80 border border-indigo-900/40 overflow-hidden font-mono">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-indigo-900/30 bg-black/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-indigo-400 animate-pulse" />
                    <div>
                        <h3 className="text-[10px] font-bold text-indigo-400 tracking-widest">NEXUS AI STRATEGIC ADVISOR</h3>
                        <p className="text-[8px] text-indigo-900">Threat Intelligence · Playbook Counsel · Predictive Analysis</p>
                    </div>
                </div>
                <button onClick={injectBrief}
                    className="flex items-center gap-1 text-[8px] px-2 py-1 rounded border border-indigo-800 text-indigo-500 hover:text-indigo-300 transition-colors">
                    <RefreshCw size={9} /> BRIEF
                </button>
            </div>

            {/* Prompt starters */}
            <div className="flex gap-1 flex-wrap p-2 border-b border-slate-900/60 shrink-0">
                {PROMPT_STARTERS.map(p => (
                    <button key={p.label} onClick={() => sendMessage(p.q)}
                        className="flex items-center gap-1 text-[8px] px-2 py-1 bg-slate-900/60 border border-slate-800 rounded text-slate-500 hover:text-indigo-400 hover:border-indigo-800 transition-all font-mono">
                        {p.icon}{p.label}
                    </button>
                ))}
            </div>

            {/* Chat area */}
            <div ref={chatRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {messages.map(msg => {
                    if (msg.role === 'user') {
                        return (
                            <div key={msg.id} className="flex justify-end">
                                <div className="max-w-[85%] bg-indigo-950/40 border border-indigo-800/50 rounded px-3 py-2 text-[10px] text-indigo-300 leading-relaxed">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    }
                    const cat = msg.category ? categoryConfig[msg.category] : categoryConfig.analysis;
                    return (
                        <div key={msg.id} className={clsx("rounded border p-3", cat.border, cat.bg)}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded bg-indigo-900/60 border border-indigo-700 flex items-center justify-center">
                                    <Sparkles size={10} className="text-indigo-400" />
                                </div>
                                <span className="text-[9px] font-bold text-indigo-500 tracking-widest">NEXUS ADVISOR</span>
                                {msg.category && <span className="text-[8px] text-slate-600">[{cat.label}]</span>}
                                <span className="text-[8px] text-slate-700 ml-auto">{msg.ts}</span>
                            </div>
                            <div className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {msg.content.split('\n').map((line, i) => {
                                    if (line.startsWith('🔴') || line.startsWith('⚠️')) return <div key={i} className="text-rose-400 font-bold">{line}</div>;
                                    if (line.startsWith('⚡') || line.startsWith('✅')) return <div key={i} className="text-emerald-400 font-bold">{line}</div>;
                                    if (line.startsWith('📊') || line.startsWith('📋')) return <div key={i} className="text-cyan-400 font-bold">{line}</div>;
                                    if (line.startsWith('•') || line.startsWith('-')) return <div key={i} className="text-slate-400 pl-2">{line}</div>;
                                    if (line.match(/^\d+\./)) return <div key={i} className="text-slate-300 pl-2">{line}</div>;
                                    if (line.startsWith('**') && line.endsWith('**')) return <div key={i} className="font-bold text-white">{line.replace(/\*\*/g, '')}</div>;
                                    if (line.startsWith('|')) return <div key={i} className="font-mono text-[9px] text-slate-500">{line}</div>;
                                    return <div key={i}>{line}</div>;
                                })}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button className="text-[8px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-indigo-400 hover:bg-slate-800 transition-colors">Execute Recommendation</button>
                                <button className="text-[8px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-500 hover:bg-slate-800 transition-colors">Detailed Report</button>
                            </div>
                        </div>
                    );
                })}
                {thinking && (
                    <div className="flex items-center gap-2 text-indigo-400/70 py-2 px-3 bg-indigo-950/20 rounded border border-indigo-900/30">
                        <Loader2 className="animate-spin shrink-0" size={12} />
                        <span className="text-[10px] tracking-wider animate-pulse">SYNTHESIZING THREAT INTELLIGENCE...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-indigo-900/30 bg-black/60 shrink-0">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-3 py-2 focus-within:border-indigo-700 transition-colors">
                    <span className="text-indigo-600 text-xs shrink-0">›</span>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                        placeholder="Ask the Advisor..."
                        disabled={thinking}
                        className="bg-transparent border-none outline-none text-[10px] text-slate-300 w-full placeholder-slate-700 font-mono"
                    />
                    <button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking}
                        className="text-indigo-500 hover:text-indigo-300 transition-colors disabled:opacity-30">
                        <Send size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};
