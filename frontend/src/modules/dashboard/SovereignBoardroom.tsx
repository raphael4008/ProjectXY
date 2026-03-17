import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// Assuming internal UI component library exists, we mock them
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Terminal } from '@/components/ui/terminal';

/**
 * SOVEREIGN BOARDROOM UI BLUEPRINT
 * "A God View of the Internet"
 * Combines Kinetic Graph Visualization, Global Risk Pulses, Financial Value metrics,
 * and the Context-Aware Action Terminal.
 */

export default function SovereignBoardroom() {
  const [financialMetrics, setFinancialMetrics] = useState({
     totalSavings: 4500000.00,
     blockedAttacks: 124,
     revenueLossPrevented: 8200000.00
  });

  const [terminalHistory, setTerminalHistory] = useState([
    { context: "system", message: "Sovereign Enterprise System Online..." },
    { context: "intel", message: "Neural De-Masker active. Graph sync OK." }
  ]);

  const handleTerminalCommand = async (command: string) => {
    setTerminalHistory(prev => [...prev, { context: "user", message: `> ${command}` }]);
    
    // Commands: DE-MASK <alias>, QUARANTINE <node>, SIMULATE_FAILURE
    if (command.startsWith('DE-MASK')) {
      const alias = command.split(' ')[1];
      setTerminalHistory(prev => [...prev, { context: "intel", message: `[Neural Sync] De-Masking ${alias}... Correlation found in Archive of Secrets. Linking to ThreatActor-A74.` }]);
    } else if (command.startsWith('QUARANTINE')) {
      const node = command.split(' ')[1];
      setTerminalHistory(prev => [...prev, { context: "action", message: `[Shield Protocol] Spawning Shadow Sandbox for ${node}. Adaptive throttling engaged.` }]);
    } else if (command === 'SIMULATE_FAILURE') {
      setTerminalHistory(prev => [...prev, { context: "system", message: `[Simulation] Warning: Critical Node down. Failover path verified. Financial Risk VaR recalculated.` }]);
    } else {
      setTerminalHistory(prev => [...prev, { context: "error", message: `Unknown command: ${command}` }]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 p-6 overscroll-none overflow-hidden space-x-6">
      
      {/* LEFT COLUMN: THE GOD VIEW & ACTION TERMINAL */}
      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        
        {/* Kinetic Visualization (Neo4j Graph Proxy) */}
        <Card className="flex-[2] bg-slate-900 border-slate-800 relative overflow-hidden shadow-2xl">
          <CardHeader>
            <CardTitle className="text-emerald-400 font-mono text-sm uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
              The God View (Kinetic Link Particles)
            </CardTitle>
          </CardHeader>
          <CardContent className="absolute inset-0 top-16 flex items-center justify-center p-0">
            {/* 
              Mocking the WebGL Neo4j Canvas 
              - Nodes throb based on Risk Score
              - Lines show traffic 
            */}
            <div className="relative w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 opacity-80 grid place-items-center">
               
               {/* Threat Actor Node */}
               <motion.div 
                 className="absolute top-1/4 left-1/4 w-12 h-12 bg-rose-500/20 rounded-full border border-rose-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                 animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                 transition={{ repeat: Infinity, duration: 1.5 }}
               >
                 <span className="text-xs font-mono text-rose-300 relative top-10">ThreatActor</span>
               </motion.div>

               {/* Target Asset Node */}
               <motion.div 
                 className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-emerald-500/20 rounded-full border border-emerald-500/50 flex items-center justify-center"
                 animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
                 transition={{ repeat: Infinity, duration: 3 }}
               >
                 <span className="text-xs font-mono text-emerald-300 relative top-12">Customer_DB</span>
               </motion.div>

               {/* Simulated Laser Link (Particle flow) */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1="25%" y1="25%" x2="75%" y2="66%" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_1s_linear_infinite]" opacity="0.5" />
               </svg>
               <span className="text-slate-500/50 uppercase font-mono tracking-[0.2em] text-sm">Interactive WebGL Graph Render Space</span>
            </div>
          </CardContent>
        </Card>

        {/* The Action Terminal */}
        <Card className="flex-1 bg-black border-slate-800 flex flex-col font-mono shadow-inner shadow-slate-900/50">
          <CardHeader className="bg-slate-900/50 border-b border-slate-800 py-3">
            <CardTitle className="text-slate-300 text-xs tracking-wider">CONTEXT-AWARE SHELL // SOVEREIGN TERMINAL</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-y-auto min-h-0 flex flex-col text-sm space-y-2 text-emerald-400">
            {terminalHistory.map((item, idx) => (
              <div key={idx} className={
                item.context === 'error' ? 'text-rose-400' : 
                item.context === 'system' ? 'text-slate-400' : 
                item.context === 'action' ? 'text-amber-400 font-bold' : 
                'text-emerald-400'
              }>
                {item.message}
              </div>
            ))}
            <div className="flex items-center mt-auto pt-4">
              <span className="text-slate-500 mr-2">SYS_ADMIN@HQ:~#</span>
              <input 
                 type="text" 
                 className="flex-1 bg-transparent outline-none text-emerald-300 border-none placeholder-slate-700" 
                 placeholder="Type DE-MASK <alias> or SIMULATE_FAILURE..."
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     handleTerminalCommand(e.currentTarget.value);
                     e.currentTarget.value = '';
                   }
                 }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: EXECUTIVE BOARDROOM (FINANCIAL RISK) */}
      <div className="w-96 flex flex-col space-y-6">
        
        <Card className="bg-slate-900 border-slate-800 h-full flex flex-col shadow-2xl shadow-emerald-900/10">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <CardTitle className="text-slate-100 text-lg uppercase tracking-wider font-semibold">The Boardroom Panel</CardTitle>
            <p className="text-xs text-slate-500 font-mono mt-2">Executive Financial Overview</p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-6 space-y-8">
            
            {/* Metric 1 */}
            <div className="flex flex-col space-y-2">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">Total Savings via Blocked Attacks</span>
              <span className="text-4xl font-light text-emerald-400 font-mono tracking-tight">
                ${financialMetrics.totalSavings.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-500/70">From {financialMetrics.blockedAttacks} Defended Incidents</span>
            </div>

            <div className="w-full h-px bg-slate-800/50" />

            {/* Metric 2 */}
            <div className="flex flex-col space-y-2">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">Est. Revenue Loss Prevented</span>
              <span className="text-4xl font-light text-amber-400 font-mono tracking-tight">
                ${financialMetrics.revenueLossPrevented.toLocaleString()}
              </span>
              <span className="text-xs text-amber-500/70">Based on Global VaR Engine</span>
            </div>

            <div className="w-full h-px bg-slate-800/50" />

            {/* Active Threats VaR */}
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs uppercase font-mono text-slate-400">Current Portfolio At-Risk</span>
                 <span className="text-xs font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded">HIGH</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{width: '60%'}}></div>
                <div className="bg-rose-500 h-full" style={{width: '10%'}}></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                <span>Safe Assets</span>
                <span>Exposed (Shadow Sandboxed)</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button disabled className="w-full py-3 bg-slate-800 text-slate-400 font-mono text-xs uppercase tracking-widest rounded border border-slate-700 hover:bg-slate-700 transition-colors shadow-lg">
                Generate Board Report
              </button>
            </div>

          </CardContent>
        </Card>

      </div>

    </div>
  );
}
