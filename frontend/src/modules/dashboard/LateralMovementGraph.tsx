import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Network, AlertTriangle } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function LateralMovementGraph() {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Simulated Graph Response from the Temporal Graph Engine (Phase 2 & Phase 8)
        const mockGraph = {
            nodes: [
                { id: '10.0.0.4', group: 1, label: 'Compromised VPN Endpoint', risk: 'CRITICAL' },
                { id: '10.0.0.12', group: 2, label: 'Lateral Target 1', risk: 'HIGH' },
                { id: 'core_db', group: 3, label: 'PII Exfiltration Zone', risk: 'FATAL' },
            ],
            links: [
                { source: '10.0.0.4', target: '10.0.0.12', value: 1, label: 'SMB Auth Burst' },
                { source: '10.0.0.12', target: 'core_db', value: 2, label: 'High-Volume Dump' }
            ]
        };
        setGraphData(mockGraph);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div className="bg-slate-900 border border-red-900 rounded-lg p-4 overflow-hidden shadow-2xl h-[400px] flex flex-col relative">
            <div className="flex items-center justify-between z-10 p-2">
                <h3 className="text-red-500 font-mono text-xl tracking-wider uppercase flex items-center">
                    <Network className="w-5 h-5 mr-2 text-red-500" />
                    Lateral Movement Detection
                </h3>
                <span className="flex items-center text-xs text-red-400 bg-red-950 px-2 py-1 rounded">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    ACTIVE KILL CHAIN
                </span>
            </div>

            <div ref={containerRef} className="flex-1 w-full relative">
                <div className="absolute inset-0 z-0">
                    {dimensions.width > 0 && (
                        <ForceGraph2D
                            graphData={graphData}
                            width={dimensions.width}
                            height={dimensions.height}
                            nodeAutoColorBy="group"
                            nodeRelSize={8}
                            linkColor={() => "rgba(239, 68, 68, 0.6)"}
                            linkDirectionalArrowLength={3.5}
                            linkDirectionalArrowRelPos={1}
                            nodeCanvasObject={(node: any, ctx, globalScale) => {
                                const label = node.label;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                const textWidth = ctx.measureText(label).width;
                                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = node.risk === 'FATAL' ? '#ff0000' : '#ff9900';
                                ctx.fillText(label, node.x, node.y);

                                node.__bckgDimensions = bckgDimensions;
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
