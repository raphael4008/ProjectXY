/**
 * WAR ROOM COMMAND DECK
 * =====================
 * 4-Quadrant expert interface for boardroom and war room decision making
 * 
 * Quadrant 1: Global Risk Heatmap & Financial VaR
 * Quadrant 2: Neural De-Masking Identity Graph
 * Quadrant 3: Secret Archive Breach Terminal
 * Quadrant 4: Kinetic "Battlefield" Map (Neo4j Pulse)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, GeoChart, Geo, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Shield, Zap, Radio, TrendingUp, Users, Lock, Globe, Play, Pause, Send } from 'lucide-react';

interface RiskMetric {
  country: string;
  threatLevel: number;
  var95: number;
  var99: number;
  riskScore: number;
}

interface ThreatActor {
  actorId: string;
  name: string;
  aliases: string[];
  threatLevel: string;
  confidence: number;
  connections: string[];
  location: string;
}

interface BreachRecord {
  datasetId: string;
  name: string;
  recordCount: number;
  affectedOrgs: string[];
  discoveredDate: string;
}

interface BattlefieldAsset {
  id: string;
  type: string;
  status: 'secure' | 'exposed' | 'compromised' | 'critical';
  location: { x: number; y: number };
  value: number;
}

interface DossierData {
  actor_id: string;
  confidence: number;
  observations: number;
  enriched_matches: number;
}

export const WarRoomCommandDeck: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskMetric[]>([]);
  const [threatActors, setThreatActors] = useState<ThreatActor[]>([]);
  const [breachData, setBreachData] = useState<BreachRecord[]>([]);
  const [battlefieldAssets, setBattlefieldAssets] = useState<BattlefieldAsset[]>([]);
  const [selectedQuadrant, setSelectedQuadrant] = useState<number | null>(null);
  const [systemStatus, setSystemStatus] = useState('OPTIMAL');
  const [threatLevel, setThreatLevel] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  
  // New state for attribution and containment
  const [attributionIndicators, setAttributionIndicators] = useState<string[]>([]);
  const [attributionInput, setAttributionInput] = useState('');
  const [dossierData, setDossierData] = useState<DossierData | null>(null);
  const [isCorrelating, setIsCorrelating] = useState(false);
  const [containmentHost, setContainmentHost] = useState('');
  const [containmentSeverity, setContainmentSeverity] = useState(9);
  const [isIsolating, setIsIsolating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Fetch risk data for Quadrant 1
  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const response = await fetch('/api/v1/intelligence/radar/snapshot');
        const data = await response.json();
        
        const mockRiskData: RiskMetric[] = [
          {
            country: 'China',
            threatLevel: 9,
            var95: 450000000,
            var99: 650000000,
            riskScore: 92,
          },
          {
            country: 'Russia',
            threatLevel: 8,
            var95: 350000000,
            var99: 520000000,
            riskScore: 85,
          },
          {
            country: 'Iran',
            threatLevel: 7,
            var95: 280000000,
            var99: 420000000,
            riskScore: 78,
          },
          {
            country: 'North Korea',
            threatLevel: 6,
            var95: 180000000,
            var99: 320000000,
            riskScore: 71,
          },
        ];
        
        setRiskData(mockRiskData);
      } catch (error) {
        console.error('Error fetching risk data:', error);
      }
    };

    fetchRiskData();
  }, []);

  // Fetch threat actors for Quadrant 2
  useEffect(() => {
    const fetchThreatActors = async () => {
      const mockActors: ThreatActor[] = [
        {
          actorId: 'ta-001',
          name: 'Lazarus Group',
          aliases: ['Hidden Cobra', 'Office of Juche Ideology'],
          threatLevel: 'CRITICAL',
          confidence: 0.98,
          connections: ['ta-002', 'ta-003'],
          location: 'North Korea',
        },
        {
          actorId: 'ta-002',
          name: 'APT1 (Comment Crew)',
          aliases: ['Advanced Persistent Threat 1', 'PLA Unit 61398'],
          threatLevel: 'CRITICAL',
          confidence: 0.97,
          connections: ['ta-001', 'ta-004'],
          location: 'China',
        },
        {
          actorId: 'ta-003',
          name: 'APT28 (Fancy Bear)',
          aliases: ['Sofacy', 'Sednit', 'Strontium'],
          threatLevel: 'HIGH',
          confidence: 0.96,
          connections: ['ta-001'],
          location: 'Russia',
        },
        {
          actorId: 'ta-004',
          name: 'APT33',
          aliases: ['Elfin', 'Shamoon', 'Timberworm'],
          threatLevel: 'HIGH',
          confidence: 0.94,
          connections: ['ta-002'],
          location: 'Iran',
        },
      ];
      
      setThreatActors(mockActors);
    };

    fetchThreatActors();
  }, []);

  // Fetch breach data for Quadrant 3
  useEffect(() => {
    const fetchBreachData = async () => {
      const mockBreaches: BreachRecord[] = [
        {
          datasetId: 'breach-001',
          name: 'MOVEit Transfer Zero-Day Exploitation',
          recordCount: 35000000,
          affectedOrgs: ['GlobalTech Inc', 'Fortune 500 Companies'],
          discoveredDate: '2023-06-15',
        },
        {
          datasetId: 'breach-002',
          name: 'MGM Grand Data Exposure',
          recordCount: 10000000,
          affectedOrgs: ['MGM Resorts'],
          discoveredDate: '2023-09-20',
        },
        {
          datasetId: 'breach-003',
          name: 'Change Healthcare Ransomware Attack',
          recordCount: 100000000,
          affectedOrgs: ['Change Healthcare', 'UnitedHealth Group'],
          discoveredDate: '2024-02-15',
        },
        {
          datasetId: 'breach-004',
          name: 'Snowflake Credential Stuffing Attack',
          recordCount: 165000000,
          affectedOrgs: ['Ticketmaster', 'Santander', 'Multiple Tech Companies'],
          discoveredDate: '2024-06-01',
        },
      ];
      
      setBreachData(mockBreaches);
    };

    fetchBreachData();
  }, []);

  // Initialize battlefield assets for Quadrant 4
  useEffect(() => {
    const mockAssets: BattlefieldAsset[] = [
      { id: 'asset-1', type: 'DataCenter', status: 'secure', location: { x: 20, y: 30 }, value: 100 },
      { id: 'asset-2', type: 'CloudStorage', status: 'exposed', location: { x: 70, y: 50 }, value: 75 },
      { id: 'asset-3', type: 'Network', status: 'compromised', location: { x: 45, y: 80 }, value: 60 },
      { id: 'asset-4', type: 'Database', status: 'critical', location: { x: 60, y: 20 }, value: 95 },
      { id: 'asset-5', type: 'APIGateway', status: 'secure', location: { x: 30, y: 70 }, value: 55 },
    ];
    
    setBattlefieldAssets(mockAssets);
  }, []);

  // API Integration: Attribution Engine
  const correlateIndicators = useCallback(async () => {
    if (attributionIndicators.length === 0) {
      setFeedbackMessage({ type: 'error', text: 'Add at least one indicator' });
      return;
    }
    
    setIsCorrelating(true);
    try {
      const response = await fetch('/api/v1/warroom/attribution/correlate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicators: attributionIndicators,
          metadata: { note: 'War Room initiated correlation' }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setDossierData(data);
      setFeedbackMessage({ type: 'success', text: `Actor ${data.actor_id} (${(data.confidence * 100).toFixed(1)}% confidence)` });
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: `Correlation failed: ${error}` });
    } finally {
      setIsCorrelating(false);
    }
  }, [attributionIndicators]);

  const addIndicator = useCallback(() => {
    if (attributionInput.trim()) {
      setAttributionIndicators([...attributionIndicators, attributionInput]);
      setAttributionInput('');
    }
  }, [attributionInput, attributionIndicators]);

  const removeIndicator = useCallback((index: number) => {
    setAttributionIndicators(attributionIndicators.filter((_, i) => i !== index));
  }, [attributionIndicators]);

  // API Integration: Containment Service
  const isolateHost = useCallback(async () => {
    if (!containmentHost.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Enter a host identifier' });
      return;
    }
    
    if (containmentSeverity < 9) {
      setFeedbackMessage({ type: 'error', text: 'Severity must be P1 (≥9) for isolation' });
      return;
    }
    
    setIsIsolating(true);
    try {
      const response = await fetch('/api/v1/warroom/containment/isolate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_identifier: containmentHost,
          severity: containmentSeverity,
          reason: 'War Room initiated isolation'
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setFeedbackMessage({ type: 'success', text: `Isolation ${data.outcome}: ${containmentHost}` });
      setThreatLevel('critical');
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: `Isolation failed: ${error}` });
    } finally {
      setIsIsolating(false);
    }
  }, [containmentHost, containmentSeverity]);

  return (
    <div className="w-full h-screen bg-black/95 text-white overflow-hidden">
      {/* SYSTEM STATUS BAR */}
      <div className="h-16 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-cyan-500/30 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-sm">SOVEREIGN COMMAND DECK</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-400">2026-03-17 00:00:00 UTC</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">System Status:</span>
            <span className={`text-sm font-bold ${
              systemStatus === 'OPTIMAL' ? 'text-green-400' : 'text-red-400'
            }`}>
              {systemStatus}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Threat Level:</span>
            <span className={`text-sm font-bold px-3 py-1 rounded border ${
              threatLevel === 'critical' ? 'border-red-500 bg-red-500/10 text-red-400' :
              threatLevel === 'high' ? 'border-orange-500 bg-orange-500/10 text-orange-400' :
              threatLevel === 'medium' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' :
              'border-green-500 bg-green-500/10 text-green-400'
            }`}>
              {threatLevel.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* 4-QUADRANT LAYOUT */}
      <div className="grid grid-cols-2 gap-3 h-[calc(100%-4rem)] p-3 bg-black/90">
        
        {/* QUADRANT 1: GLOBAL RISK HEATMAP & FINANCIAL VaR */}
        <motion.div
          className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-500/30 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400/50 transition-all"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 1 ? null : 1)}
          whileHover={{ borderColor: 'rgba(96, 165, 250, 0.8)' }}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-blue-950/40 border-b border-blue-500/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h2 className="font-mono text-sm text-blue-300">GLOBAL RISK HEATMAP</h2>
              </div>
              <span className="text-xs text-blue-400">VaR @ 99% Confidence</span>
            </div>

            {/* Risk Heatmap Data */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {riskData.map((risk, idx) => (
                <motion.div
                  key={idx}
                  className="bg-black/50 border border-blue-500/20 rounded p-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-blue-300">{risk.country}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      risk.threatLevel >= 8 ? 'bg-red-500/20 text-red-400' :
                      risk.threatLevel >= 6 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {risk.threatLevel}/10
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">VaR 95%:</span>
                      <span className="text-cyan-400 font-mono ml-1">
                        ${(risk.var95 / 1000000).toFixed(0)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">VaR 99%:</span>
                      <span className="text-red-400 font-mono ml-1">
                        ${(risk.var99 / 1000000).toFixed(0)}M
                      </span>
                    </div>
                  </div>
                  
                  {/* Risk Score Bar */}
                  <div className="mt-2 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${risk.riskScore}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* QUADRANT 2: NEURAL DE-MASKING IDENTITY GRAPH */}
        <motion.div
          className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/30 rounded-lg overflow-hidden cursor-pointer hover:border-purple-400/50 transition-all"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 2 ? null : 2)}
          whileHover={{ borderColor: 'rgba(168, 85, 247, 0.8)' }}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-purple-950/40 border-b border-purple-500/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h2 className="font-mono text-sm text-purple-300">NEURAL DE-MASKING GRAPH</h2>
              </div>
              <span className="text-xs text-purple-400">{threatActors.length} Threat Actors</span>
            </div>

            {/* Threat Actor Network */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {threatActors.map((actor, idx) => (
                <motion.div
                  key={idx}
                  className="bg-black/50 border border-purple-500/20 rounded p-3 hover:border-purple-400/50 transition-all"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-xs text-purple-300">{actor.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{actor.location}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      actor.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {actor.threatLevel}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-2">
                    Aliases: {actor.aliases.join(', ')}
                  </div>
                  
                  {/* Confidence Score */}
                  <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${actor.confidence * 100}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="text-xs text-purple-400 mt-1">{(actor.confidence * 100).toFixed(0)}% Confidence</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* QUADRANT 3: SECRET ARCHIVE BREACH TERMINAL */}
        <motion.div
          className="bg-gradient-to-br from-orange-900/20 to-orange-900/5 border border-orange-500/30 rounded-lg overflow-hidden cursor-pointer hover:border-orange-400/50 transition-all"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 3 ? null : 3)}
          whileHover={{ borderColor: 'rgba(249, 115, 22, 0.8)' }}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-orange-950/40 border-b border-orange-500/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-400" />
                <h2 className="font-mono text-sm text-orange-300">SECRET ARCHIVE BREACH DATA</h2>
              </div>
              <span className="text-xs text-orange-400">{breachData.length} Active Breaches</span>
            </div>

            {/* Breach Records */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {breachData.map((breach, idx) => (
                <motion.div
                  key={idx}
                  className="bg-black/50 border border-orange-500/20 rounded p-3 hover:border-orange-400/50 transition-all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-xs text-orange-300">{breach.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Discovered: {breach.discoveredDate}</p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-2">
                    Records: <span className="text-orange-400 font-mono">{(breach.recordCount / 1000000).toFixed(0)}M</span>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    Organizations: {breach.affectedOrgs.join(', ')}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* QUADRANT 4: KINETIC BATTLEFIELD MAP */}
        <motion.div
          className="bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30 rounded-lg overflow-hidden cursor-pointer hover:border-green-400/50 transition-all"
          onClick={() => setSelectedQuadrant(selectedQuadrant === 4 ? null : 4)}
          whileHover={{ borderColor: 'rgba(34, 197, 94, 0.8)' }}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-green-950/40 border-b border-green-500/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-400" />
                <h2 className="font-mono text-sm text-green-300">KINETIC BATTLEFIELD MAP</h2>
              </div>
              <span className="text-xs text-green-400">{battlefieldAssets.length} Assets</span>
            </div>

            {/* Asset Map Canvas */}
            <div className="flex-1 bg-gradient-to-br from-black to-green-950/10 relative overflow-hidden">
              <svg className="w-full h-full opacity-20">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" className="text-green-500"/>
              </svg>

              {/* Assets on map */}
              <div className="absolute inset-0">
                {battlefieldAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    className={`absolute w-3 h-3 rounded-full border-2 ${
                      asset.status === 'secure' ? 'bg-green-500/50 border-green-400' :
                      asset.status === 'exposed' ? 'bg-yellow-500/50 border-yellow-400' :
                      asset.status === 'compromised' ? 'bg-orange-500/50 border-orange-400' :
                      'bg-red-500/50 border-red-400'
                    }`}
                    style={{
                      left: `${asset.location.x}%`,
                      top: `${asset.location.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    animate={{
                      scale: asset.status === 'critical' ? [1, 1.3, 1] : 1,
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    title={`${asset.type} - ${asset.status}`}
                  >
                    {asset.status === 'critical' && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-red-400"
                        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Asset legend */}
              <div className="absolute bottom-2 left-2 text-xs space-y-1 text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500/50 border border-green-400" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50 border border-yellow-400" />
                  <span>Exposed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500/50 border border-orange-400" />
                  <span>Compromised</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/50 border border-red-400" />
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WarRoomCommandDeck;
