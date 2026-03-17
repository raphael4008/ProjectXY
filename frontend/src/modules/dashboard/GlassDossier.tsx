'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { X, AlertTriangle, Zap, Shield, TrendingUp, Clock, Lock } from 'lucide-react';

interface GlassDossierProps {
    node: any;
    deepScanResult: any | null;
    isScanning: boolean;
    onClose: () => void;
}

export const GlassDossier: React.FC<GlassDossierProps> = ({
    node,
    deepScanResult,
    isScanning,
    onClose,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring', damping: 20 }}
            className="w-80 max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
            {/* Glass Card Container */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/10">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white tracking-wide truncate">
                            {node.name || node.id || 'Unknown Node'}
                        </h3>
                        <p className="text-[10px] text-white/60 mt-1">Entity Dossier</p>
                    </div>
                    <motion.button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white ml-2 shrink-0"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <X size={16} />
                    </motion.button>
                </div>

                {/* Node Info */}
                <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                    {/* Type */}
                    <div>
                        <p className="text-[9px] font-bold text-white/50 tracking-widest mb-1">TYPE</p>
                        <p className="text-[11px] text-white/80 font-mono">{node.type || 'asset'}</p>
                    </div>

                    {/* Risk Score */}
                    {deepScanResult && (
                        <div>
                            <p className="text-[9px] font-bold text-white/50 tracking-widest mb-1">RISK SCORE</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className={clsx(
                                            "h-full rounded-full transition-all",
                                            deepScanResult.riskScore > 75 ? 'bg-rose-500' :
                                                deepScanResult.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${deepScanResult.riskScore}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-white/80 w-8 text-right">
                                    {deepScanResult.riskScore}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <p className="text-[9px] font-bold text-white/50 tracking-widest mb-1">STATUS</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[11px] text-white/80">Active</p>
                        </div>
                    </div>
                </div>

                {/* Scan Results */}
                {deepScanResult && (
                    <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                        <p className="text-[9px] font-bold text-white/50 tracking-widest">SCAN RESULTS</p>

                        {/* Vulnerabilities */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-white/70 flex items-center gap-1.5">
                                <AlertTriangle size={12} className="text-orange-400" />
                                VULNERABILITIES
                            </p>
                            <div className="space-y-1.5">
                                {deepScanResult.vulnerabilities?.map((vuln: any, i: number) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                                        <p className="text-[9px] font-mono text-orange-400/90 truncate">{vuln.type}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={clsx(
                                                'text-[8px] font-bold px-1.5 py-0.5 rounded',
                                                vuln.severity === 'CRITICAL' ? 'bg-rose-500/30 text-rose-300' :
                                                    vuln.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                                                        'bg-amber-500/30 text-amber-300'
                                            )}>
                                                {vuln.severity}
                                            </span>
                                            <span className="text-[8px] text-white/50 font-mono">{vuln.score}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Linked Threats */}
                        {deepScanResult.linkedThreats?.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-white/70 flex items-center gap-1.5">
                                    <Zap size={12} className="text-rose-400" />
                                    LINKED THREATS
                                </p>
                                <div className="space-y-1.5">
                                    {deepScanResult.linkedThreats.slice(0, 2).map((threat: any, i: number) => (
                                        <div key={i} className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
                                            <p className="text-[9px] text-white/70 line-clamp-2">{threat.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Last Seen */}
                        <div className="flex items-center gap-2 text-[9px] text-white/60">
                            <Clock size={11} />
                            <span>Last seen: {deepScanResult.lastSeen}</span>
                        </div>
                    </div>
                )}

                {/* Scanning State */}
                {isScanning && (
                    <div className="py-4 flex flex-col items-center gap-2">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-6 h-6"
                        >
                            <Shield size={24} className="text-indigo-400" />
                        </motion.div>
                        <p className="text-[9px] text-white/70 tracking-widest font-bold">DEEP SCAN IN PROGRESS</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                    <button className="w-full px-3 py-2 bg-gradient-to-r from-cyan-500/80 to-cyan-600/80 hover:from-cyan-500 hover:to-cyan-600 text-white text-[10px] font-bold rounded-lg transition-all backdrop-blur-sm border border-cyan-400/30">
                        INVESTIGATE
                    </button>
                    <button className="w-full px-3 py-2 bg-gradient-to-r from-rose-500/20 to-rose-600/20 hover:from-rose-500/40 hover:to-rose-600/40 text-rose-300 text-[10px] font-bold rounded-lg transition-all backdrop-blur-sm border border-rose-400/20">
                        ISOLATE NODE
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
