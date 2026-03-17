"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { socketClient } from '../lib/socket';

const API_BASE_URL = "http://localhost:8000/api/v1";

// --- Helper Hook for Polling ---
function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}


// --- Quadrant Components (now accepting live data) ---

const LinguisticHub = ({ dossier }) => (
  <div className="bg-gray-800/50 rounded-lg p-4 h-full overflow-y-auto">
    <h2 className="text-lg font-bold text-cyan-400 mb-2">Linguistic Hub</h2>
    {!dossier?.enrichment?.babelx && <p className="text-sm text-gray-400">Awaiting Babel X chatter...</p>}
    <div className="mt-4 space-y-2">
      {dossier?.enrichment?.babelx?.map((chatter, i) => (
        <p key={i} className="text-xs text-gray-300">
            [{new Date().toLocaleTimeString()}] <span className="text-red-400">[{chatter.source_language.substring(0,2).toUpperCase()}]</span>: {chatter.translated_text}
        </p>
      ))}
    </div>
  </div>
);

const NeuralDeMasking = ({ demaskingResult }) => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const fingerprint = demaskingResult?.fingerprint;

    useEffect(() => {
        if (!fingerprint) {
            setGraphData({ nodes: [], links: [] }); // Clear graph if no fingerprint
            return;
        };

        const fetchGraphData = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/threat-actors/${fingerprint}/graph`);
                if (!response.ok) throw new Error("Failed to fetch de-masking graph");
                const data = await response.json();
                setGraphData(data);
            } catch (error) {
                console.error("Error fetching graph data:", error);
                // Optionally, set some error state to display in the UI
            }
        };

        fetchGraphData();
    }, [fingerprint]); // Re-run effect when fingerprint changes

    return(
        <div className="bg-gray-800/50 rounded-lg p-4 h-full">
            <h2 className="text-lg font-bold text-cyan-400 mb-2">Neural De-Masking</h2>
            <p className="text-xs text-gray-400 truncate">Fingerprint: {fingerprint || '...'}</p>
            <div className="w-full h-full">
                <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="id"
                    backgroundColor="transparent"
                    linkColor={() => 'rgba(255,255,255,0.2)'}
                    nodeAutoColorBy="type"
                />
            </div>
        </div>
    )
};

const RadarAndArchives = ({ dossier }) => (
  <div className="bg-gray-800/50 rounded-lg p-4 h-full font-mono text-xs text-gray-300 overflow-y-auto">
    <h2 className="text-lg font-bold text-cyan-400 mb-2">Radar & Archives</h2>
    {!dossier && <p>&gt; Awaiting intelligence...</p>}
    {dossier?.enrichment?.shodan && <p className="text-green-400">[SHODAN] Found {dossier.enrichment.shodan.ports?.length} ports.</p>}
    {dossier?.enrichment?.intelx && <p className="text-yellow-400">[INTELX] {dossier.enrichment.intelx?.length} leaks found.</p>}
  </div>
);

const TheBattlefield = () => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });

    useEffect(() => {
        const handleBattlefieldUpdate = (data) => {
            console.log("[Battlefield] Received update:", data);
            // Assuming data is in { nodes: [], links: [] } format from the backend
            // And links might have a property like `status: 'active'` for attacks
            setGraphData(data);
        };

        socketClient.subscribe('battlefield-update', handleBattlefieldUpdate);
        
        // Request initial state or rely on backend to send it upon connection
        
        return () => {
            socketClient.unsubscribe('battlefield-update', handleBattlefieldUpdate);
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    return(
        <div className="bg-gray-800/50 rounded-lg p-4 h-full">
            <h2 className="text-lg font-bold text-cyan-400 mb-2">The Battlefield</h2>
            <div className="w-full h-full">
                <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="id"
                    backgroundColor="transparent"
                    // Link color is now data-driven based on a property like 'status'
                    linkColor={(link) => (link.status === 'active' ? 'rgba(255, 0, 0, 1)' : 'rgba(255,255,255,0.2)')}
                    linkWidth={(link) => (link.status === 'active' ? 4 : 2)}
                    linkDirectionalParticles={(link) => (link.status === 'active' ? 4 : 0)}
                    linkDirectionalParticleWidth={4}
                    nodeAutoColorBy="id"
                />
            </div>
        </div>
    )
};


const CommandPalette = ({ onCommand, disabled }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if(disabled) return;
    onCommand(input);
    setInput('');
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2">
        <form onSubmit={handleSubmit}>
            <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? "Awaiting mission..." : "Ctrl+K to DE-MASK <alias> or TRAP <IP>"}
            className="w-full bg-gray-900/80 border border-cyan-400/50 text-white rounded-lg p-2 text-center"
            disabled={disabled}
            />
        </form>
    </div>
  );
};


// --- Main Situation Room Component ---

const Notification = ({ message, onDismiss }) => {
    if (!message) return null;
    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <span>{message}</span>
            <button onClick={onDismiss} className="ml-4 font-bold">X</button>
        </div>
    );
};


const SituationRoom = () => {
    const [mission, setMission] = useState(null);
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [notification, setNotification] = useState(null);

    const launchMission = useCallback(async (target: string) => {
        try {
            setError(null);
            setNotification(`Launching mission for ${target}...`);
            const response = await fetch(`${API_BASE_URL}/missions/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target }),
            });
            if (!response.ok) throw new Error("Failed to launch mission");
            const data = await response.json();
            setMission(data);
            setIsPolling(true);
            setNotification(`Mission ${data.mission_id} launched!`);
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    // 0. Connect to WebSocket on component mount
    useEffect(() => {
        socketClient.connect();
    }, []);

    // 1. Launch a default mission on mount
    useEffect(() => {
        launchMission("hacker@example.com");
    }, [launchMission]);

    // 2. Poll for mission updates
    const pollMissionStatus = useCallback(async () => {
        if (!mission?.mission_id) return;

        try {
            const response = await fetch(`${API_BASE_URL}/missions/${mission.mission_id}`);
            if (!response.ok) throw new Error("Failed to fetch mission status");
            const data = await response.json();
            setMission(data);

            if (data.phase === "COMPLETED" || data.phase === "FAILED") {
                setIsPolling(false);
                setNotification(`Mission ${data.mission_id} finished with status: ${data.phase}`);
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (err) {
            setError(err.message);
            setIsPolling(false);
        }
    }, [mission?.mission_id]);

    useInterval(pollMissionStatus, isPolling ? 3000 : null);
    
    const handleCommand = async (command: string) => {
        console.log("Command executed:", command);
        const [action, ...args] = command.split(' ');
        const target = args.join(' ');

        if (action.toUpperCase() === 'DE-MASK') {
            await launchMission(target);
        } else if (action.toUpperCase() === 'TRAP') {
            try {
                setNotification(`Executing TRAP on ${target}...`);
                const response = await fetch(`${API_BASE_URL}/actions/trap`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip: target }),
                });
                if (!response.ok) throw new Error("Trap command failed");
                const result = await response.json();
                setNotification(`TRAP on ${target} executed! Status: ${result.status}`);
                setTimeout(() => setNotification(null), 5000);
            } catch (err) {
                setError(err.message);
            }
        }
    };
    
    const dossier = mission?.analysis_findings;

    return (
        <div className="w-screen h-screen bg-black text-white p-4">
            <div className="absolute top-4 left-4">
                <p>Mission ID: <span className="text-yellow-400">{mission?.mission_id || '...'}</span></p>
                <p>Phase: <span className="text-cyan-400">{mission?.phase || '...'}</span></p>
                {error && <p className="text-red-500">Error: {error}</p>}
            </div>
            <Notification message={notification} onDismiss={() => setNotification(null)} />
            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full w-full">
                <LinguisticHub dossier={dossier} />
                <NeuralDeMasking demaskingResult={dossier?.demasking} />
                <RadarAndArchives dossier={dossier} />
                <TheBattlefield />
            </div>
            <CommandPalette onCommand={handleCommand} disabled={!mission} />
        </div>
    );
};

export default SituationRoom;
