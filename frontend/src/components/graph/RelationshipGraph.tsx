'use client';

import dynamic from 'next/dynamic';
import { useRef, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Dynamic import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <div className="text-center text-gray-500 mt-20 font-mono">Initializing Graph Engine...</div>
});

interface GraphData {
    nodes: any[];
    links: any[];
}

export default function RelationshipGraph({ entityId }: { entityId: string }) {
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                w: containerRef.current.clientWidth,
                h: containerRef.current.clientHeight
            });
        }

        const loadGraph = async () => {
            try {
                const data = await api.getGraphNeighborhood(entityId);
                setGraphData(data);
            } catch (err) {
                console.error("Failed to load graph data", err);
            }
        };

        if (entityId) {
            loadGraph();
        }

    }, [entityId]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <ForceGraph2D
                width={dimensions.w}
                height={dimensions.h}
                graphData={graphData}
                nodeLabel="id"
                nodeColor={(node: any) => {
                    if (node.id === entityId) return '#00f3ff'; // Target
                    if (node.group === 3) return '#ff003c'; // Alert
                    return '#ffffff';
                }}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                backgroundColor="#000000"
                nodeRelSize={6}
            />
        </div>
    );
}
