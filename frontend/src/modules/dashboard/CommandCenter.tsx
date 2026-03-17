'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
    Zap, Radar, Crosshair, ChevronDown, Search,
    Brain, Network, TrendingUp, AlertCircle
} from 'lucide-react';
import { GodsEyeGraph } from '@/components/vanguard/GodsEyeGraph';
import { ActionTerminal } from './ActionTerminal';
import { GlassDossier } from './GlassDossier';
import { CommandPalette } from './CommandPalette';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TabConfig {
    id: 'battlefield' | 'intelligence' | 'offensive';
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    color: string;
}

interface DeepScanResult {
    nodeId: string;
    riskScore: number;
    linkedThreats: any[];
    vulnerabilities: any[];
    lastSeen: string;
}

// ─── CommandCenter Component ──────────────────────────────────────────────────

interface CommandCenterProps {
    selectedNode: any | null;
    threatFeed: any[];
    graphData: { nodes: any[], links: any[] };
    onExecuteAction: (command: string) => void;
    onNodeSelect: (node: any) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
    selectedNode,
    threatFeed,
    graphData,
    onExecuteAction,
    onNodeSelect,
}) => {
    const [activeTab, setActiveTab] = useState<'battlefield' | 'intelligence' | 'offensive'>('battlefield');
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [deepScanResult, setDeepScanResult] = useState<DeepScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredThreats, setFilteredThreats] = useState(threatFeed);

    // ─── Tabs configuration ─────────────────────────────────────────────────

    const tabs: TabConfig[] = [
        {
            id: 'battlefield',
            label: 'BATTLEFIELD',
            icon: <Radar size={14} />,
            color: 'from-cyan-500 to-cyan-600',
        },
        {
            id: 'intelligence',
            label: 'INTELLIGENCE',
            icon: <Brain size={14} />,
            badge: threatFeed.filter(t => t.severity === 'CRITICAL').length,
            color: 'from-indigo-500 to-indigo-600',
        },
        {
            id: 'offensive',
            label: 'OFFENSIVE',
            icon: <Zap size={14} />,
            color: 'from-rose-500 to-rose-600',
        },
    ];

    // ─── Handle Ctrl+K for command palette ──────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(!showCommandPalette);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCommandPalette]);

    // ─── Deep scan trigger when node selected ────────────────────────────

    useEffect(() => {
        if (selectedNode) {
            triggerDeepScan(selectedNode);
        }
    }, [selectedNode]);

    // ─── Simulate deep scan from backend ─────────────────────────────────

    const triggerDeepScan = async (node: any) => {
        setIsScanning(true);
        // Simulate API call to backend
        setTimeout(() => {
            setDeepScanResult({
                nodeId: node.id || 'unknown',
                riskScore: Math.floor(Math.random() * 100),
                linkedThreats: threatFeed.slice(0, 3),
                vulnerabilities: [
                    { type: 'CVE-2024-1234', severity: 'HIGH', score: 7.8 },
                    { type: 'CVE-2024-5678', severity: 'MEDIUM', score: 5.2 },
                    { type: 'Misconfiguration', severity: 'HIGH', score: 8.1 },
                ],
                lastSeen: new Date().toLocaleTimeString(),
            });
            setIsScanning(false);
        }, 1500);
    };

    // ─── Filter threats by search query ──────────────────────────────────

    useEffect(() => {
        if (searchQuery.trim()) {
            setFilteredThreats(
                threatFeed.filter(t =>
                    t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.src_ip?.includes(searchQuery)
                )
            );
        } else {
            setFilteredThreats(threatFeed);
        }
    }, [searchQuery, threatFeed]);

    // ─── Tab content renderer ────────────────────────────────────────────

    const renderTabContent = () => {
        switch (activeTab) {
            case 'battlefield':
                return (
                    <div className="w-full h-full relative bg-black">
                        <GodsEyeGraph />
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                            <div className="relative w-3 h-3">
                                <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
                                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                            </div>
                            <span className="text-[9px] text-cyan-600 tracking-widest">SCANNING</span>
                        </div>
                    </div>
                );

            case 'intelligence':
                return (
                    <div className="w-full h-full flex flex-col bg-black">
                        {/* Search bar */}
                        <div className="p-3 border-b border-slate-800/60 shrink-0">
                            <div className="relative">
                                <Search size={12} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600" />
                                <input
                                    type="text"
                                    placeholder="Search threats, IPs, techniques..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded px-8 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                                />
                            </div>
                        </div>

                        {/* Threat list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredThreats.length > 0 ? (
                                filteredThreats.map((threat) => (
                                    <div key={threat.id} className="px-3 py-2 border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                "w-1.5 h-1.5 rounded-full shrink-0",
                                                threat.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' :
                                                    threat.severity === 'HIGH' ? 'bg-orange-500' :
                                                        threat.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                            )} />
                                            <span className={clsx(
                                                "text-[8px] font-bold px-1 py-0.5 rounded border",
                                                threat.severity === 'CRITICAL' ? 'bg-rose-950/50 border-rose-700 text-rose-400' :
                                                    threat.severity === 'HIGH' ? 'bg-orange-950/40 border-orange-700 text-orange-400' :
                                                        threat.severity === 'MEDIUM' ? 'bg-amber-950/30 border-amber-700 text-amber-400' :
                                                            'bg-emerald-950/30 border-emerald-700 text-emerald-400'
                                            )}>
                                                {threat.severity}
                                            </span>
                                            {threat.technique && (
                                                <span className="text-[8px] bg-slate-900 border border-slate-700 text-slate-500 px-1 rounded font-bold">{threat.technique}</span>
                                            )}
                                            <span className="text-[8px] text-slate-700 ml-auto shrink-0">{threat.ts}</span>
                                        </div>
                                        <p className="text-[10px] leading-relaxed text-slate-400 group-hover:text-slate-300">{threat.text}</p>
                                        {threat.src_ip && (
                                            <p className="text-[8px] text-slate-700 mt-0.5">SRC: <span className="text-slate-500 font-mono">{threat.src_ip}</span></p>
                                        )}
                                        {threat.confidence > 0 && (
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <div className="h-0.5 flex-1 bg-slate-900 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all",
                                                            threat.confidence > 90 ? 'bg-rose-500' : threat.confidence > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                                        )}
                                                        style={{ width: `${threat.confidence}%` }}
                                                    />
                                                </div>
                                                <span className="text-[8px] text-slate-600">{threat.confidence}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-700 opacity-50">
                                    <AlertCircle size={24} className="mb-2" />
                                    <p className="text-[10px] tracking-widest">No threats found</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'offensive':
                return (
                    <div className="w-full h-full flex flex-col">
                        <ActionTerminal selectedNode={selectedNode} onExecuteAction={onExecuteAction} />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {/* Command Palette */}
            <AnimatePresence>
                {showCommandPalette && (
                    <CommandPalette
                        {...({
                            onClose: () => setShowCommandPalette(false),
                            onExecuteCommand: (cmd: any) => {
                                onExecuteAction(cmd);
                                setShowCommandPalette(false);
                            }
                        } as any)}
                    />
                )}
            </AnimatePresence>

            <div className="w-full h-full flex flex-col bg-[#050505] text-slate-300 font-mono overflow-hidden">
                {/* ── TAB BAR ── */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-[#0a0a0a] shrink-0">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] tracking-widest transition-all relative group",
                                activeTab === tab.id
                                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-${tab.color}/50`
                                    : 'bg-slate-900/50 text-slate-400 hover:text-slate-300 border border-slate-800'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.badge && activeTab === tab.id && (
                                <motion.span
                                    className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[9px] font-mono"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                >
                                    {tab.badge}
                                </motion.span>
                            )}
                            {activeTab === tab.id && (
                                <motion.div
                                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tab.color} rounded-full`}
                                    layoutId="activeTabIndicator"
                                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                />
                            )}
                        </motion.button>
                    ))}

                    {/* Ctrl+K hint */}
                    <div className="ml-auto flex items-center gap-2 text-[9px] text-slate-600 px-3 py-2 bg-slate-900/30 rounded border border-slate-800">
                        <span className="text-slate-500">⌘ K</span>
                        <span>Command Palette</span>
                    </div>
                </div>

                {/* ── MAIN CONTENT ── */}
                <div className="flex-1 relative overflow-hidden flex gap-3 p-3">
                    {/* Main tab content */}
                    <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/60 bg-black">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full h-full"
                            >
                                {renderTabContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ── Glass Dossier (Floating panel) ── */}
                    <AnimatePresence>
                        {selectedNode && (
                            <GlassDossier
                                node={selectedNode}
                                deepScanResult={deepScanResult}
                                isScanning={isScanning}
                                onClose={() => onNodeSelect(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};
