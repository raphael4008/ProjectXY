'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Shield, Eye, EyeOff, Lock, Cpu, Wifi, AlertCircle, CheckCircle } from 'lucide-react';

const BOOT_LINES = [
    'NEXUS CYBER INTELLIGENCE PLATFORM v5.0',
    'Initializing Zero-Trust Authentication Engine...',
    'Verifying HSM key escrow... OK',
    'Loading threat intelligence context... OK',
    'Establishing encrypted session tunnel... OK',
    'READY — Operator authentication required.',
];

const SCAN_LINES = [
    '██░░░░░░░░░░░░░░░░░░░░░░░░░  8%  Verifying identity...',
    '████████░░░░░░░░░░░░░░░░░░░░ 28%  Cross-referencing biometrics...',
    '████████████░░░░░░░░░░░░░░░░ 44%  Applying Zero-Trust policy...',
    '████████████████████░░░░░░░░ 70%  Generating access token...',
    '█████████████████████████░░░ 88%  Sealing audit log entry...',
    '████████████████████████████100%  ACCESS GRANTED',
];

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [bootLines, setBootLines] = useState<string[]>([]);
    const [scanLine, setScanLine] = useState<string | null>(null);
    const [scanIndex, setScanIndex] = useState(0);
    const [glitch, setGlitch] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Boot sequence
    useEffect(() => {
        BOOT_LINES.forEach((line, i) => {
            setTimeout(() => setBootLines(prev => [...prev, line]), i * 320 + 200);
        });
        setTimeout(() => inputRef.current?.focus(), BOOT_LINES.length * 320 + 400);
    }, []);

    // Random glitch effect
    useEffect(() => {
        const t = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 120);
        }, 5000 + Math.random() * 4000);
        return () => clearInterval(t);
    }, []);

    // Scan animation during auth
    useEffect(() => {
        if (!isLoading) { setScanLine(null); setScanIndex(0); return; }
        setScanLine(SCAN_LINES[0]);
        const t = setInterval(() => {
            setScanIndex(prev => {
                const next = prev + 1;
                if (next < SCAN_LINES.length) { setScanLine(SCAN_LINES[next]); return next; }
                clearInterval(t); return prev;
            });
        }, 380);
        return () => clearInterval(t);
    }, [isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.login(username, password);
            login(response.access_token);
        } catch (err: any) {
            setError('AUTHENTICATION FAILED — Invalid credentials or policy violation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030507] flex items-center justify-center font-mono relative overflow-hidden">

            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'linear-gradient(rgba(0,243,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

            {/* Scan line overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_3px] opacity-20 z-0" />

            {/* Radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.06)_0%,transparent_70%)]" />

            {/* Animated corner brackets */}
            {[
                'top-6 left-6 border-t-2 border-l-2',
                'top-6 right-6 border-t-2 border-r-2',
                'bottom-6 left-6 border-b-2 border-l-2',
                'bottom-6 right-6 border-b-2 border-r-2',
            ].map((cls, i) => (
                <div key={i} className={`absolute w-10 h-10 border-cyan-500/30 ${cls}`} />
            ))}

            {/* System status dots */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                {[
                    { label: 'NEO4J', ok: true },
                    { label: 'POSTGRES', ok: true },
                    { label: 'REDIS', ok: true },
                    { label: 'TLS', ok: true },
                ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'} animate-pulse`} />
                        <span className="text-[8px] text-slate-700 tracking-widest">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Main panel */}
            <div className="relative z-10 w-full max-w-[420px] mx-4">

                {/* Logo & title */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                                <Shield className="text-cyan-500" size={26} />
                            </div>
                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
                        </div>
                    </div>
                    <h1 className={`text-xl font-black tracking-[0.3em] text-white uppercase transition-all ${glitch ? 'text-cyan-400 skew-x-1' : ''}`}>
                        NEXUS
                    </h1>
                    <p className="text-[10px] text-slate-600 tracking-[0.2em] mt-1 uppercase">
                        Cyber Intelligence Platform
                    </p>
                </div>

                {/* Boot terminal */}
                <div className="bg-black/60 border border-[#0a2a2a] rounded-lg p-3 mb-4 min-h-[110px] backdrop-blur-sm shadow-[0_0_30px_rgba(0,243,255,0.05)]">
                    <div className="text-[8px] text-slate-700 tracking-widest mb-2 flex items-center gap-2">
                        <Cpu size={9} className="text-cyan-800" />
                        SYSTEM DIAGNOSTICS
                    </div>
                    {bootLines.map((line, i) => (
                        <div key={i} className={`text-[9px] leading-relaxed ${i === bootLines.length - 1 ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {i < bootLines.length - 1 && <span className="text-emerald-700 mr-1">✓</span>}
                            {line === bootLines[bootLines.length - 1] && bootLines.length === BOOT_LINES.length && (
                                <span className="text-emerald-500 mr-1">●</span>
                            )}
                            {line}
                        </div>
                    ))}
                    {bootLines.length < BOOT_LINES.length && (
                        <span className="inline-block w-1.5 h-3 bg-cyan-500 animate-pulse ml-0.5 align-middle" />
                    )}
                </div>

                {/* Auth form */}
                <div className="bg-black/70 border border-[#0d1f1f] rounded-lg backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,243,255,0.04)] overflow-hidden">
                    {/* Form header */}
                    <div className="px-5 py-3 border-b border-[#0d1f1f] flex items-center gap-2">
                        <Lock size={11} className="text-cyan-600" />
                        <span className="text-[9px] font-bold text-slate-500 tracking-widest">OPERATOR AUTHENTICATION</span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <Wifi size={9} className="text-emerald-600" />
                            <span className="text-[8px] text-emerald-700">ENCRYPTED</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-[9px] font-bold text-slate-600 tracking-widest mb-1.5">
                                OPERATIVE ID (EMAIL)
                            </label>
                            <input
                                ref={inputRef}
                                id="username"
                                type="email"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="operator@nexus.mil"
                                className="w-full bg-[#050f0f] border border-[#0d2020] text-white placeholder-slate-800 text-sm px-3 py-2.5 rounded focus:outline-none focus:border-cyan-600/60 focus:shadow-[0_0_15px_rgba(0,243,255,0.08)] transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[9px] font-bold text-slate-600 tracking-widest mb-1.5">
                                AUTHENTICATION CODE
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#050f0f] border border-[#0d2020] text-white placeholder-slate-800 text-sm px-3 py-2.5 pr-10 rounded focus:outline-none focus:border-cyan-600/60 focus:shadow-[0_0_15px_rgba(0,243,255,0.08)] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-rose-950/20 border border-rose-900/40 rounded px-3 py-2">
                                <AlertCircle size={12} className="text-rose-500 shrink-0" />
                                <span className="text-[9px] text-rose-400 font-bold">{error}</span>
                            </div>
                        )}

                        {/* Scan animation */}
                        {scanLine && (
                            <div className="bg-black/60 border border-cyan-900/30 rounded px-3 py-2">
                                <div className="text-[9px] text-cyan-500 font-mono">{scanLine}</div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 rounded font-bold text-sm tracking-widest uppercase transition-all duration-300 relative overflow-hidden
                                ${isLoading
                                    ? 'bg-cyan-950/50 text-cyan-700 border border-cyan-900 cursor-not-allowed'
                                    : 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                                }`}
                        >
                            {!isLoading && (
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                            )}
                            {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                        </button>
                    </form>
                </div>

                {/* Footer warning */}
                <div className="mt-4 text-center">
                    <p className="text-[8px] text-slate-800 tracking-widest uppercase">
                        ⚠ Restricted access — All sessions are cryptographically logged and audited
                    </p>
                    <p className="text-[8px] text-slate-900 mt-1">
                        Unauthorized access is a federal offense under 18 U.S.C. § 1030
                    </p>
                </div>
            </div>
        </div>
    );
}
