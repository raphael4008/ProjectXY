"use client";

import React, { useState, useEffect } from 'react';
import { ThermometerSun, ShieldAlert, Zap, Layers, Grid, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

const MOCK_NODES = Array.from({ length: 144 }).map((_, i) => ({
    id: `node-${i}`,
    x: i % 12,
    y: Math.floor(i / 12),
    temp: Math.random() * 100, // Thermal Risk Score (0-100)
    status: 'ONLINE', // ONLINE, ISOLATED
}));

export default function ThreatHeatmapsPage() {
    const [nodes, setNodes] = useState(MOCK_NODES);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isSimulating, setIsSimulating] = useState(true);

    // Simulate thermal fluctuations
    useEffect(() => {
        if (!isSimulating) return;
        const interval = setInterval(() => {
            setNodes(prev => prev.map(n => {
                if (n.status === 'ISOLATED') return n;
                // Random walk for temperature
                let newTemp = n.temp + (Math.random() * 20 - 10);
                // Artificial hot spots
                if (n.x > 3 && n.x < 7 && n.y > 4 && n.y < 8) {
                    newTemp += Math.random() * 10;
                }
                newTemp = Math.max(0, Math.min(100, newTemp));
                return { ...n, temp: newTemp };
            }));
        }, 1500);
        return () => clearInterval(interval);
    }, [isSimulating]);

    const handleNodeClick = (node: any) => {
        setSelectedNode(node);
    };

    const isolateNode = () => {
        if (!selectedNode) return;
        setNodes(prev => prev.map(n =>
            n.id === selectedNode.id ? { ...n, status: 'ISOLATED', temp: 0 } : n
        ));
        setSelectedNode({ ...selectedNode, status: 'ISOLATED', temp: 0 });
    };

    const getThermColor = (temp: number, status: string) => {
        if (status === 'ISOLATED') return 'bg-cyan-900/20 border-cyan-500/20';
        if (temp > 85) return 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] border-red-400 absolute z-10 scale-110';
        if (temp > 60) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] border-orange-400';
        if (temp > 30) return 'bg-yellow-500 border-yellow-600';
        if (temp > 10) return 'bg-green-600 border-green-700';
        return 'bg-slate-900 border-[#1f1f1f]'; // Cool/Idle
    };

    return (
        <div className="flex flex-col h-screen p-6 bg-[#050505] text-white overflow-hidden relative font-mono">
            <header className="mb-6 flex items-center justify-between border-b border-orange-900/40 pb-4 relative z-10">
                <div>
                    <h1 className="text-2xl font-bold text-orange-500 tracking-widest flex items-center gap-3">
                        <ThermometerSun size={24} className="animate-spin-slow" />
                        THERMAL SUB-GRID
                    </h1>
                    <p className="text-orange-600/60 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Spatial Node Correlation & Risk Heat</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={clsx(
                            "border px-4 py-2 flex items-center gap-2 rounded text-xs font-bold tracking-widest transition-colors",
                            isSimulating ? "bg-orange-950/50 border-orange-900 text-orange-500" : "bg-[#0a0a0a] border-slate-800 text-slate-500"
                        )}
                    >
                        <Activity size={16} />
                        {isSimulating ? 'LIVE TELEMETRY: ON' : 'LIVE TELEMETRY: PAUSED'}
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-6 relative z-10 min-h-0">

                {/* Heatmap Grid */}
                <div className="col-span-12 lg:col-span-8 bg-[#0a0a0a] border border-orange-900/30 rounded-xl relative shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] p-6 overflow-auto custom-scrollbar">
                    <div className="grid grid-cols-12 gap-1 md:gap-2 h-full content-start opacity-90">
                        {nodes.map(node => (
                            <div
                                key={node.id}
                                onClick={() => handleNodeClick(node)}
                                className={clsx(
                                    "aspect-square rounded-[2px] cursor-pointer transition-all duration-700 border flex items-center justify-center relative group",
                                    getThermColor(node.temp, node.status),
                                    selectedNode?.id === node.id && "ring-2 ring-white scale-110 z-20"
                                )}
                            >
                                <span className={clsx(
                                    "opacity-0 group-hover:opacity-100 text-[8px] font-bold text-white transition-opacity",
                                    node.temp > 85 ? "opacity-100" : ""
                                )}>
                                    {node.status === 'ISOLATED' ? 'OFF' : Math.round(node.temp)}°
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Node Inspector */}
                <div className="col-span-12 lg:col-span-4 bg-black/60 glass-panel-heavy border border-orange-900/30 rounded-xl p-6 flex flex-col overflow-y-auto custom-scrollbar">
                    <h2 className="text-xs font-bold text-orange-500 tracking-widest uppercase mb-4 flex items-center gap-2 border-b border-orange-900/30 pb-2">
                        <Grid size={14} /> Node Inspector
                    </h2>

                    {selectedNode ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                            <div className="space-y-2">
                                <span className={clsx(
                                    "px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded border",
                                    selectedNode.status === 'ISOLATED' ? "bg-cyan-950/50 border-cyan-900 text-cyan-500" :
                                        selectedNode.temp > 85 ? "bg-red-950/50 border-red-900 text-red-500 animate-pulse" :
                                            "bg-orange-950/50 border-orange-900 text-orange-500"
                                )}>
                                    {selectedNode.status === 'ISOLATED' ? 'CONTAINED' : selectedNode.temp > 85 ? 'CRITICAL OVERHEAT' : 'NOMINAL'}
                                </span>
                                <h3 className="text-2xl font-bold text-white tracking-widest">{selectedNode.id.toUpperCase()}</h3>
                                <p className="text-slate-400 text-sm">Spatial Coordinates: X:{selectedNode.x} Y:{selectedNode.y}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0a0a0a] border border-slate-800 p-3 rounded">
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Thermal Risk</span>
                                    <span className={clsx(
                                        "text-xl font-bold",
                                        selectedNode.temp > 85 ? "text-red-500" : "text-orange-400"
                                    )}>
                                        {Math.round(selectedNode.temp)}°
                                    </span>
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-3 rounded">
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Traffic Vol</span>
                                    <span className="text-xl font-bold text-slate-300">
                                        {selectedNode.status === 'ISOLATED' ? '0' : Math.round(selectedNode.temp * 42)} p/s
                                    </span>
                                </div>
                            </div>

                            {/* Auto-Orchestration Panel */}
                            {selectedNode.status !== 'ISOLATED' && (
                                <div className="mt-8 border border-red-900/30 rounded-lg overflow-hidden">
                                    <div className="bg-red-950/30 p-3 flex items-center justify-between border-b border-red-900/30">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert size={14} className="text-red-500" />
                                            <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Combat Orchestrator</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-black/50 text-center">
                                        <p className="text-[10px] text-slate-400 mb-4 px-2">
                                            If thermal threshold exceeds acceptable limits, engage Ghost Protocol to sever node routing paths immediately.
                                        </p>
                                        <button
                                            onClick={isolateNode}
                                            className="w-full bg-red-900/50 hover:bg-red-600 border border-red-500 text-white font-bold py-3 rounded tracking-widest uppercase text-sm flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                        >
                                            <Zap size={16} /> ISOLATE HOST
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedNode.status === 'ISOLATED' && (
                                <div className="mt-8 border border-cyan-900/30 rounded-lg p-6 bg-cyan-950/10 text-center border-dashed">
                                    <ShieldAlert size={32} className="text-cyan-500 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-cyan-400 tracking-widest uppercase">Node Segregated</p>
                                    <p className="text-[10px] text-cyan-600 mt-2">All routing dropped. Hardware offline.</p>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                            <Layers size={32} className="text-orange-500" />
                            <div>
                                <p className="text-sm text-orange-400 font-bold tracking-widest uppercase mb-1">Awaiting Node Selection</p>
                                <p className="text-xs text-slate-500">Select a grid sector to inspect thermal variance and risk metrics.</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
