'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
import { Activity, ShieldAlert, Globe } from 'lucide-react';
import { api, Entity } from '@/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState({ pipeline: 'Connecting...', nodes: '-', active_breaches: 0 });
    const [priorityTargets, setPriorityTargets] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Parallel fetch for stats and entities
                const [statsData, entities] = await Promise.all([
                    api.getStats(),
                    api.getEntities()
                ]);

                setStats(statsData);
                setPriorityTargets(entities.slice(0, 5));
            } catch (err) {
                console.error("Failed to load dashboard data", err);
                setStats({ pipeline: 'Degraded', nodes: 'Err', active_breaches: 0 });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className="p-8 h-full flex flex-col gap-8">

            {/* Header / Search */}
            <header className="flex flex-col gap-6 text-center pt-8">
                <h1 className="text-4xl font-bold font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    PROJECT XY INTELLIGENCE
                </h1>
                <SearchBar />
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* Left Col: Stats & Quick Intel */}
                <div className="col-span-3 flex flex-col gap-6">
                    <div className="glass-panel p-6 rounded-2xl flex-1 border-l-4 border-l-primary">
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4" /> System Status
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span>Ingestion Pipeline</span>
                                <span className="text-success">{stats.pipeline}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span>Graph Nodes</span>
                                <span className="font-mono">{stats.nodes}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl flex-1 border-l-4 border-l-alert">
                        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> Priority Targets
                        </h3>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-xs text-gray-500 font-mono text-center py-4">Scanning...</div>
                            ) : priorityTargets.length === 0 ? (
                                <div className="text-xs text-gray-500 font-mono text-center py-4">No Active Targets</div>
                            ) : (
                                priorityTargets.map(entity => (
                                    <div
                                        key={entity.id}
                                        onClick={() => router.push(`/dashboard/entity/${entity.id}`)}
                                        className="flex items-center justify-between p-2 bg-white/5 rounded transition hover:bg-white/10 cursor-pointer"
                                    >
                                        <span className="font-mono text-sm truncate max-w-[120px]" title={entity.canonical_name}>
                                            {entity.canonical_name}
                                        </span>
                                        <span className={`text-xs font-bold ${entity.risk_score > 70 ? 'text-alert' : 'text-warning'}`}>
                                            {entity.risk_score}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Col: Interactive Map / Graph (Placeholder) - KEEP AS IS */}
                <div className="col-span-6 glass-panel rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] opacity-10 bg-cover bg-center grayscale invert mix-blend-overlay"></div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                        <Globe className="h-16 w-16 text-primary animate-pulse" />
                        <p className="text-primary font-mono text-sm tracking-widest">AWAITING TARGET SELECTION</p>
                    </div>
                </div>

                {/* Right Col: AI Insights - KEEP MOCK FOR NOW OR FETCH LATER */}
                <div className="col-span-3 glass-panel p-6 rounded-2xl border-r-4 border-r-secondary">
                    <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                        AI Narrative Feed
                    </h3>
                    <div className="space-y-4 text-sm text-gray-300 font-mono leading-relaxed">
                        <p>
                            <span className="text-secondary">[12:04]</span> Correlation detected between <span className="text-white">User_X</span> and <span className="text-white">IP_Block_A</span> via shared recovery email.
                        </p>
                        <div className="w-full h-px bg-white/10"></div>
                        <p>
                            <span className="text-secondary">[11:58]</span> New breach data ingested from Source_B. 450 records updated.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

