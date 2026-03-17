'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { socketClient } from '@/lib/socket';

// Dynamically import force-graph to prevent SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
    id: string;
    group: number; // 1: Hostile, 2: Honeypot, 3: Internal Asset, 4: Digital Twin Sandbox
    val: number; // Node size (Risk score)
    name: string;
    type: string;
}

interface GraphLink {
    source: string;
    target: string;
    action: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export const GodsEyeGraph = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

    // Mock Initial State (In production, this is fetched via REST on load)
    useEffect(() => {
        setGraphData({
            nodes: [
                { id: "core-db", group: 3, val: 5, name: "Aegis-Core-DB", type: "Internal" },
                { id: "hp-ssh-1", group: 2, val: 3, name: "Labyrinth-Gateway-SSH", type: "Honeypot" },
                { id: "104.22.4.19", group: 1, val: 8, name: "Ryuk-C2-Alpha", type: "Hostile" }
            ],
            links: [
                { source: "104.22.4.19", target: "hp-ssh-1", action: "TARGETED" }
            ]
        });
    }, []);

    // Listen for Real-Time Telemetry & Active Defense Actions
    useEffect(() => {
        setIsConnected(true); // Assuming true if the component mounts and subscribes

        const handleGraphUpdate = (data: any) => {
            console.log("[GODS EYE] Receiving Telemetry payload...", data);

            setGraphData(prev => {
                // Deduplicate and merge incoming nodes/links
                const nodeMap = new Map(prev.nodes.map(n => [n.id, n]));
                data.nodes.forEach((n: GraphNode) => nodeMap.set(n.id, n));

                return {
                    nodes: Array.from(nodeMap.values()),
                    links: [...prev.links, ...data.links]
                };
            });
        };

        socketClient.subscribe('graph_update', handleGraphUpdate);

        return () => {
            socketClient.unsubscribe('graph_update', handleGraphUpdate);
            setIsConnected(false);
        };
    }, []);

    // Graph Visual Rendering Logic
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Inter, sans-serif`;

        // Define 'God-Tier' Aesthetics Matrix
        let nodeColor = "#1e293b"; // Default dark
        let pulseGlow = false;

        if (node.group === 1) { // Hostile
            nodeColor = "#ef4444"; // Red
            pulseGlow = true;
        } else if (node.group === 2) { // Honeypot (Labyrinth)
            nodeColor = "#a855f7"; // Purple
        } else if (node.group === 3) { // Internal Asset (Aegis Vault)
            nodeColor = "#3b82f6"; // Blue
        } else if (node.group === 4) { // Digital Twin Sandbox
            nodeColor = "#eab308"; // Yellow Warning
            ctx.setLineDash([5, 5]); // Dashed border to indicate "Simulated Reality"
        }

        // Pulse Animation for Hostile Nodes
        if (pulseGlow) {
            const time = Date.now() / 300;
            const glowSize = node.val + Math.sin(time) * 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(239, 68, 68, 0.2)"; // Soft red glow
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Reset dashed lines for text
        ctx.setLineDash([]);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(label, node.x, node.y + node.val + (4 / globalScale));
    }, []);

    // Active Defense Interaction
    const handleNodeClick = useCallback((node: any) => {
        if (node.group === 1) { // Clicked Hostile Infrastructure
            // Trigger Autonomous Swarm or SDN Reroute Action Terminal
            console.log(`[VANGUARD SEC-OPS] Targeting Hostile Infra: ${node.id}`);
            // In full implementation, this opens the "STRIKE/MITIGATE" Action Panel
            alert(`TARGET LOCKED: ${node.name}\nInitiating Tier 2 AI Swarm Investigation...`);

            // Mock API Trigger
            // fetch('/api/v1/swarms/investigate', { method: 'POST', body: JSON.stringify({ telemetry_id: node.id, ...})})
        }
    }, []);

    return (
        <div className="relative w-full h-full min-h-[400px] bg-[#020617] rounded-xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)] group">
            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] mix-blend-overlay"></div>

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 z-10 p-4 bg-slate-950/80 backdrop-blur-xl rounded-lg border border-slate-700/80 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                <h2 className="text-emerald-400 font-mono font-bold tracking-widest text-sm mb-1">
                    GODS EYE OMNI-GRAPH
                </h2>
                <div className="flex flex-col space-y-1 mt-3">
                    <div className="flex items-center text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div> Internal Assets
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div> Labyrinth (Honeypots)
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div> Hostile Infra
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2 border-2 border-dashed border-slate-950"></div> Digital Twin Sandbox
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                    <span className="text-xs text-slate-400 font-mono">
                        WS: {isConnected ? <span className="text-emerald-500">CONNECTED</span> : <span className="text-red-500">OFFLINE</span>}
                    </span>
                </div>
            </div>

            <ForceGraph2D
                graphData={graphData}
                nodeCanvasObject={nodeCanvasObject}
                onNodeClick={handleNodeClick}
                backgroundColor="#020617"
                linkColor={() => 'rgba(148, 163, 184, 0.4)'}
                linkWidth={1.5}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                d3VelocityDecay={0.3}
            />
        </div>
    );
};
