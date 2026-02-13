'use client';

import { useEffect, useState } from 'react';
import RiskMeter from '@/components/ui/RiskMeter';
import RelationshipGraph from '@/components/graph/RelationshipGraph';
import { Shield, Fingerprint, Clock, Share2, Loader2, AlertTriangle } from 'lucide-react';
import { api, Entity } from '@/lib/api';

export default function EntityProfilePage({ params }: { params: { id: string } }) {
    const entityId = params.id;
    const [entity, setEntity] = useState<Entity | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEntityData = async () => {
            try {
                // Parallel fetch for Entity details and AI Summary
                const [entityData, summaryData] = await Promise.all([
                    api.getEntity(entityId),
                    api.getAISummary(entityId)
                ]);

                setEntity(entityData);
                setSummary(summaryData.summary);
            } catch (err) {
                console.error("Failed to load entity profile", err);
                setError("Could not load entity intelligence. ID might be invalid.");
            } finally {
                setLoading(false);
            }
        };

        if (entityId) {
            loadEntityData();
        }
    }, [entityId]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="font-mono text-gray-400 animate-pulse">Accessing Secure Archives...</p>
            </div>
        );
    }

    if (error || !entity) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <AlertTriangle className="h-12 w-12 text-alert" />
                <p className="font-mono text-xl text-white">INTELLIGENCE NOT FOUND</p>
                <p className="font-mono text-gray-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
            {/* 1. Header Identity Card */}
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                        <Fingerprint className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-mono text-white uppercase">{entity.canonical_name}</h1>
                        <div className="flex gap-4 text-sm text-gray-400 mt-2 font-mono">
                            <span className="bg-white/5 px-2 py-1 rounded">ID: {entityId}</span>
                            <span className="bg-white/5 px-2 py-1 rounded uppercase">Type: {entity.type}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-widest">Risk Assessment</p>
                        <p className={`font-bold ${entity.risk_score > 70 ? 'text-alert' : 'text-warning'}`}>
                            {entity.risk_score > 70 ? 'CRITICAL' : entity.risk_score > 40 ? 'ELEVATED' : 'LOW'}
                        </p>
                    </div>
                    <RiskMeter score={entity.risk_score} />
                </div>
            </div>

            {/* 2. Main Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* Left: Attributes & Evidence */}
                <div className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase flex gap-2">
                            <Shield className="h-4 w-4" /> Validated Selectors
                        </h3>
                        <div className="space-y-3 font-mono text-sm">
                            {(entity.attributes || []).map((attr: any, idx: number) => (
                                <div key={idx} className="flex justify-between p-2 bg-white/5 rounded">
                                    <span className="text-gray-300 truncate max-w-[200px]" title={attr.value}>{attr.value}</span>
                                    <span className={`text-xs border px-1 rounded ${attr.confidence > 0.8 ? 'text-success border-success' : 'text-warning border-warning'}`}>
                                        {attr.type.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                            {(!entity.attributes || entity.attributes.length === 0) && (
                                <div className="text-gray-500 italic">No selectors found.</div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl flex-1">
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase flex gap-2">
                            <Clock className="h-4 w-4" /> Activity Timeline
                        </h3>
                        <div className="border-l-2 border-white/10 pl-4 space-y-6 text-sm">
                            {/* Mock Timeline for now as API doesn't return timeline yet */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary"></div>
                                <p className="text-gray-200">Entity Created / Ingested</p>
                                <p className="text-xs text-gray-500 font-mono">2023-11-01</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Graph Visualization */}
                <div className="col-span-5 glass-panel rounded-2xl flex flex-col">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-400 uppercase flex gap-2">
                            <Share2 className="h-4 w-4" /> Relationship Network
                        </h3>
                    </div>
                    <div className="flex-1 relative bg-black/50">
                        <RelationshipGraph entityId={entityId} />
                    </div>
                </div>

                {/* Right: AI Analysis */}
                <div className="col-span-3 glass-panel p-6 rounded-2xl border-l-4 border-l-primary overflow-y-auto">
                    <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-widest">
                        AI Intelligence Summary
                    </h3>
                    <div className="prose prose-invert prose-sm">
                        {summary ? (
                            <div className="whitespace-pre-wrap">{summary}</div>
                        ) : (
                            <p className="text-gray-500 italic">Generating intelligence summary...</p>
                        )}

                        <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-mono">
                            Confidence: CALCULATING...
                            <br />
                            Source: NEURAL ENGINE
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
