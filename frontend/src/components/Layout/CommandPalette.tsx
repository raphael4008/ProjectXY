"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Terminal, Shield, Crosshair, Activity, Cpu, ThermometerSun, Zap, Network } from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/lib/api';

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [nlResult, setNlResult] = useState<any>(null);
    const router = useRouter();
    const { toggleIntercept } = useUIStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    const commands = [
        { name: "Global Ops Dashboard", icon: GlobeIcon, action: () => router.push('/') },
        { name: "Active Defense (SOC)", icon: Shield, action: () => router.push('/defense') },
        { name: "Threat Intelligence Map", icon: Activity, action: () => router.push('/intelligence') },
        { name: "Thermal Sub-Grid (Heatmap)", icon: ThermometerSun, action: () => router.push('/heatmaps') },
        { name: "Asset Recovery (Targeting)", icon: Crosshair, action: () => router.push('/devices') },
        { name: "System Metrics", icon: Cpu, action: () => router.push('/monitoring') },
        { name: "Deep Discovery (Omni-Probe)", icon: Terminal, action: () => toggleIntercept(true) },
    ];

    const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

    const runCommand = (action: () => void) => {
        action();
        setIsOpen(false);
        setQuery('');
        setNlResult(null);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setNlResult(null);
        try {
            const res = await api.search(query);
            setNlResult(res);
        } catch (error) {
            console.error("NLP Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 font-mono">
                <form onSubmit={handleSearch} className="flex items-center px-4 py-3 border-b border-[#1f1f1f] relative">
                    <Search className={clsx("mr-3", isSearching ? "text-cyan-500 animate-pulse" : "text-gray-500")} size={20} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or ask a question (e.g., 'Why is node X high risk?')..."
                        className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 placeholder:text-gray-600 font-mono text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="hidden sm:inline-block border border-gray-700 bg-gray-900 rounded px-2 py-0.5 text-xs text-gray-400 font-mono">ENTER to Ask</kbd>
                    <kbd className="hidden sm:inline-block ml-2 border border-gray-700 bg-gray-900 rounded px-2 py-0.5 text-xs text-gray-400 font-mono">ESC</kbd>
                </form>

                <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar">

                    {/* Omni-Search Results Area */}
                    {nlResult && (
                        <div className="mb-4 p-4 border border-cyan-900/40 bg-cyan-950/20 rounded-lg animate-in slide-in-from-top-2">
                            <h3 className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Zap size={14} /> Omni-Search Response
                            </h3>

                            {nlResult.type === 'text' && (
                                <p className="text-sm text-slate-300 leading-relaxed">{nlResult.message}</p>
                            )}

                            {nlResult.type === 'search_results' && (
                                <div className="space-y-2 mt-2">
                                    {(nlResult.data || []).map((entity: any) => (
                                        <div key={entity.id} className="bg-black p-3 rounded border border-slate-800 flex justify-between items-center">
                                            <div>
                                                <span className="text-sm font-bold text-white">{entity.name}</span>
                                                <span className="text-[10px] text-slate-500 ml-2 uppercase">TYPE: {entity.type}</span>
                                            </div>
                                            <span className="text-xs font-bold text-red-500 px-2 py-1 bg-red-950/30 rounded border border-red-900">
                                                RISK: {entity.risk}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {nlResult.type === 'graph_result' && (
                                <div className="bg-black p-6 rounded border border-slate-800 flex flex-col items-center justify-center text-center opacity-80 mt-2">
                                    <Network size={32} className="text-cyan-500 mb-2" />
                                    <p className="text-sm text-white font-bold tracking-widest">{nlResult.data}</p>
                                    <p className="text-xs text-slate-500 mt-1">Cypher Query Execution Successful</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Standard Commands */}
                    <div className="px-2 pb-1 pt-2">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Global Navigation Commands</span>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 font-mono text-xs">No matching system routes.</div>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map((cmd, i) => (
                                <button
                                    key={i}
                                    onClick={() => runCommand(cmd.action)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[#1f1f1f] rounded-lg transition-colors font-mono"
                                >
                                    <cmd.icon size={16} className="text-cyan-500" />
                                    {cmd.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GlobeIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </svg>
    )
}
