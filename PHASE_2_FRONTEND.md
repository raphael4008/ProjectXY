# 🎨 Phase 2: The Magnificent Tabbed Shell - Quickstart Guide

**Build the "Smart Weapon" UI for Script Execution & Real-Time Monitoring**

Now that you have the **Operations Arsenal** backend (Phase 1), it's time to build the **Frontend Terminal UI** that makes it all accessible and beautiful.

---

## 📋 What You'll Build

A **Tabbed Terminal Component** in the CommandCenter with:

1. **Tab 1: Live Logs** - Real-time scrolling output from executing scripts
2. **Tab 2: Script Editor** - Monaco Editor to edit scripts on-the-fly
3. **Tab 3: Forensic DVR** - Playback of past command executions

---

## 🎯 Implementation Roadmap

### Step 1: Create the MissionShell Component

File: `frontend/src/components/terminal/MissionShell.tsx`

```typescript
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BarChart3, Code, Play, Square, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExecutionLog {
  timestamp: string;
  type: 'output' | 'error' | 'warning';
  message: string;
}

interface ExecutionResult {
  execution_id: string;
  script_id: string;
  script_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  stdout: string;
  stderr: string;
  duration_seconds: number;
  exit_code?: number;
}

export const MissionShell: React.FC<MissionShellProps> = ({
  selectedScript,
  activeTarget,
  onScriptExecute
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'editor' | 'forensics'>('logs');
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle script selection
  useEffect(() => {
    if (selectedScript) {
      setEditorCode(selectedScript.code);
    }
  }, [selectedScript]);

  // Execute script with WebSocket streaming
  const handleExecuteScript = async () => {
    if (!selectedScript) return;

    setIsExecuting(true);
    setLogs([
      {
        timestamp: new Date().toISOString(),
        type: 'output',
        message: `[*] Starting execution of: ${selectedScript.name}`
      },
      {
        timestamp: new Date().toISOString(),
        type: 'output',
        message: `[*] Target: ${activeTarget?.ip || 'localhost'}`
      }
    ]);

    // Connect WebSocket for real-time streaming
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ops/ws/execute/${selectedScript.id}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'output') {
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            type: 'output',
            message: message.data
          }
        ]);
      } else if (message.type === 'result') {
        setExecutionResult(message.data);
        setIsExecuting(false);
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            type: message.data.status === 'completed' ? 'output' : 'error',
            message: `[✓] Execution completed in ${message.data.duration_seconds}s (Exit: ${message.data.exit_code})`
          }
        ]);
      } else if (message.type === 'error') {
        setIsExecuting(false);
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toISOString(),
            type: 'error',
            message: `[✗] Error: ${message.data}`
          }
        ]);
      }
    };

    wsRef.current.onerror = () => {
      setIsExecuting(false);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: '[✗] WebSocket connection error'
        }
      ]);
    };
  };

  const handleStopExecution = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsExecuting(false);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-4">
      {/* Mission Status Header */}
      <div className="mb-4 p-3 bg-slate-900/80 border border-cyan-500/30 rounded flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-cyan-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>TARGET: {activeTarget?.ip || 'none'}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} />
            <span>TEAM: {selectedScript?.metadata.team.toUpperCase() || 'none'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span>STATUS: {isExecuting ? 'EXECUTING...' : 'READY'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleExecuteScript}
            disabled={isExecuting || !selectedScript}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded flex items-center gap-1 transition"
          >
            <Play size={12} /> EXECUTE
          </button>
          {isExecuting && (
            <button
              onClick={handleStopExecution}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center gap-1 transition"
            >
              <Square size={12} /> STOP
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)} className="w-full h-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border-b border-cyan-500/20">
          <TabsTrigger value="logs" className="text-cyan-400 data-[state=active]:text-cyan-300">
            Live Logs
          </TabsTrigger>
          <TabsTrigger value="editor" className="text-cyan-400 data-[state=active]:text-cyan-300">
            <Code size={14} className="mr-1" /> Script Editor
          </TabsTrigger>
          <TabsTrigger value="forensics" className="text-cyan-400 data-[state=active]:text-cyan-300">
            Forensic DVR
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Logs */}
        <TabsContent value="logs" className="mt-4 h-[400px] overflow-y-auto font-mono text-xs">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`py-1 ${
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-cyan-400'
              }`}
            >
              <span className="text-gray-500">[{log.timestamp.split('T')[1].slice(0, 8)}]</span> {log.message}
            </motion.div>
          ))}
          <div ref={logsEndRef} />
        </TabsContent>

        {/* Tab 2: Script Editor */}
        <TabsContent value="editor" className="mt-4">
          {/* TODO: Integrate Monaco Editor here */}
          <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded h-[400px] overflow-y-auto">
            <pre className="text-cyan-400 text-xs font-mono">{editorCode}</pre>
            {/* TODO: Add save button & update script */}
          </div>
        </TabsContent>

        {/* Tab 3: Forensic DVR */}
        <TabsContent value="forensics" className="mt-4">
          {executionResult && (
            <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded space-y-2 text-sm">
              <div className="text-cyan-400">
                <strong>Script:</strong> {executionResult.script_name}
              </div>
              <div className="text-yellow-400">
                <strong>Status:</strong> {executionResult.status}
              </div>
              <div className="text-green-400">
                <strong>Duration:</strong> {executionResult.duration_seconds}s
              </div>
              <div className="text-red-400">
                <strong>Exit Code:</strong> {executionResult.exit_code}
              </div>
              <div className="mt-4 max-h-[250px] overflow-y-auto">
                <pre className="text-cyan-400 text-xs">{executionResult.stdout}</pre>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Step 2: Install Required Dependencies

```bash
npm install monaco-editor framer-motion zustand
```

Or with yarn:
```bash
yarn add monaco-editor framer-motion zustand
```

### Step 3: Integrate MissionShell into CommandCenter

Update `frontend/src/modules/dashboard/CommandCenter.tsx`:

```typescript
import { MissionShell } from '@/components/terminal/MissionShell';

// Inside CommandCenter component
{activeTab === 'offensive' && (
  <div className="grid grid-cols-3 gap-4 h-[600px]">
    <div className="col-span-2">
      {/* Script library / selector */}
    </div>
    <div className="col-span-1">
      <MissionShell 
        selectedScript={selectedScript}
        activeTarget={selectedNode}
        onScriptExecute={handleScriptExecution}
      />
    </div>
  </div>
)}
```

### Step 4: Add Monaco Editor Integration

Create `frontend/src/components/terminal/ScriptEditor.tsx`:

```typescript
'use client';

import React from 'react';
import { Editor } from '@monaco-editor/react';

interface ScriptEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  code,
  language,
  onChange
}) => {
  return (
    <Editor
      height="100%"
      defaultLanguage={language === 'python' ? 'python' : 'bash'}
      value={code}
      onChange={(value) => onChange(value || '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 12,
        wordWrap: 'on',
        lineNumbers: 'on'
      }}
    />
  );
};
```

---

## 🎨 Styling Tips for "Magnificence"

Apply these expert-grade styles to make it feel like a "Smart Weapon":

```css
/* Hacker Glow Effect */
.terminal-text {
  color: #06b6d4; /* cyan-400 */
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  font-family: 'Fira Code', monospace;
}

/* Glassmorphism Background */
.mission-shell {
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(6, 182, 212, 0.2);
}

/* Tab Underline Animation */
.tab-underline {
  position: relative;
}

.tab-underline::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #06b6d4, #0891b2);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tab-underline[data-state='active']::after {
  opacity: 1;
}
```

---

## 🔌 WebSocket Handling Best Practices

When streaming execution results:

```typescript
// 1. Connect with proper error handling
const connectWebSocket = (scriptId: string) => {
  try {
    const ws = new WebSocket(`${WS_URL}/ops/ws/execute/${scriptId}`);
    
    ws.onopen = () => console.log('✅ Connected');
    ws.onmessage = handleMessage;
    ws.onerror = handleError;
    ws.onclose = handleClose;
    
    return ws;
  } catch (e) {
    console.error('Failed to connect:', e);
  }
};

// 2. Handle different message types
const handleMessage = (event: MessageEvent) => {
  const { type, data } = JSON.parse(event.data);
  
  switch (type) {
    case 'output':
      addLog(data, 'output');
      break;
    case 'error':
      addLog(data, 'error');
      break;
    case 'result':
      setResult(data);
      break;
  }
};

// 3. Auto-reconnect on failure
const reconnect = (scriptId: string, attempt = 0) => {
  if (attempt > 3) {
    console.error('Max reconnection attempts reached');
    return;
  }
  
  setTimeout(() => {
    const ws = connectWebSocket(scriptId);
    if (!ws) {
      reconnect(scriptId, attempt + 1);
    }
  }, 1000 * Math.pow(2, attempt)); // Exponential backoff
};
```

---

## 📊 State Management with Zustand

Create a store for execution state:

```typescript
// frontend/src/store/executionStore.ts
import { create } from 'zustand';

interface ExecutionState {
  logs: ExecutionLog[];
  isExecuting: boolean;
  result: ExecutionResult | null;
  selectedScript: Script | null;
  
  addLog: (log: ExecutionLog) => void;
  clearLogs: () => void;
  setExecuting: (state: boolean) => void;
  setResult: (result: ExecutionResult) => void;
  setSelectedScript: (script: Script) => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  logs: [],
  isExecuting: false,
  result: null,
  selectedScript: null,
  
  addLog: (log) => set((state) => ({
    logs: [...state.logs, log]
  })),
  
  clearLogs: () => set({ logs: [] }),
  setExecuting: (isExecuting) => set({ isExecuting }),
  setResult: (result) => set({ result }),
  setSelectedScript: (selectedScript) => set({ selectedScript })
}));
```

---

## ✅ Testing Checklist

- [ ] WebSocket connects successfully
- [ ] Logs stream in real-time
- [ ] Tab switching is smooth (Framer Motion)
- [ ] Script execution completes and shows result
- [ ] Error handling works for network failures
- [ ] UI stays responsive during execution
- [ ] Logs auto-scroll to bottom
- [ ] Stop button cancels execution
- [ ] Editor displays script code correctly

---

## 🚀 Quick Test

Once implemented, test the full flow:

```bash
# Terminal 1: Start backend
cd backend
docker-compose up -d
python seed.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Execute script via WebSocket
wscat -c ws://localhost:8000/ops/ws/execute/script-blue-1
```

---

## 📚 Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Monaco Editor React](https://github.com/smonaco-editor/react)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## 🎯 What Comes Next?

Once Phase 2 is complete, you'll have built:
- ✅ Live log streaming
- ✅ Real-time script editing
- ✅ Execution history playback

Then move to Phase 3:
- 🔮 **Neural De-Masking**: Display attacker social aliases
- 🔮 **Linguistic Mesh**: Auto-translate attack payloads
- 🔮 **Digital Twin Snapshots**: Database state backups before experiments

**You're building a command center. Make it beautiful.** 💎

