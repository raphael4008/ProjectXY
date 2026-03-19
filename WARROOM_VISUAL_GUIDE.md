# War Room Dashboard - Visual Setup & Customization Guide

## Overview

The War Room Dashboard provides a unified command center for threat intelligence operations. This guide covers visual customization, layout options, and integration with backend services.

---

## Dashboard Layout (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│  War Room Command Center                      [⚙️ Settings] [👤] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ TABS ─────────────────────────────────────────────────────┐ │
│  │ 🌍 Battlefield  │ 📖 Intelligence  │ 🛠️  Operations        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ BATTLEFIELD (Default View) ───────────────────────────────┐ │
│  │                                                             │ │
│  │  Threat Actor Graph (Neo4j)                               │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │                                                      │ │ │
│  │  │  [TA-12345678]  ──HAS_EVIDENCE──> [192.168.1.1]     │ │ │
│  │  │       ↓                                  ↓            │ │ │
│  │  │  [evil.com]  ──HAS_EVIDENCE──> [attacker@evil.com] │ │ │
│  │  │                                                      │ │ │
│  │  │  Confidence: 0.75 | Last Seen: 2026-03-19 10:30 UTC│ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  Attribution Controls                                      │ │
│  │  [Add indicators...] [Correlate] [Clear] [Export]         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ Floating Control Panels (Right Side) ────────────────────┐ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ ATTRIBUTION RESULTS                                 │   │ │
│  │ │ Actor ID: TA-87654321                              │   │ │
│  │ │ Confidence: 0.82                                   │   │ │
│  │ │ Observations: 24                                   │   │ │
│  │ │ Enriched Matches: 8                                │   │ │
│  │ │                                                     │   │ │
│  │ │ [View in Graph] [Export Dossier]                   │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Status Bar: ✅ Connected | Org: default_org | Users: 3         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab Details

### Tab 1: Battlefield (Threat Actor Visualization)

**Purpose:** Visualize threat actors and their infrastructure relationships.

**Components:**

#### 1.1 Neo4j Graph View
```
Feature                  | Implementation
─────────────────────────┼──────────────────────────
Real-time rendering      | React + cytoscape.js
Node types               | ThreatActor (red), Evidence (blue)
Relationship labels      | HAS_EVIDENCE, KNOWN_AS, etc.
Interactive drill-down   | Click node → show details panel
Layout algorithm         | Force-directed (cose)
Zoom/Pan                 | Mouse wheel + drag
```

**Node Color Coding:**
- 🔴 **Red nodes:** Threat actors
- 🔵 **Blue nodes:** Infrastructure evidence
- 🟡 **Yellow nodes:** Compromised hosts
- ⚪ **Gray nodes:** Low-confidence indicators

**Example Interaction:**
```javascript
// Click on threat actor node
node.on('tap', function() {
  // Display:
  // - Actor ID
  // - Confidence score
  // - First/Last seen dates
  // - Evidence list
  // - Export option
});
```

#### 1.2 Attribution Controls
```
┌─ Threat Indicator Input ─────────────────────┐
│ [Indicator 1] ✓    [Indicator 2] ✓          │
│ [Add more...] + Add  [Clear all] ×           │
│                                              │
│ Metadata:                                    │
│ [Note: ___________________]                  │
│ [Classification: [TLP:AMBER ▼]]             │
│                                              │
│ [🔍 Correlate] [📊 Export] [🔄 Clear]      │
└──────────────────────────────────────────────┘
```

**Indicator Input Validation:**
- ✅ IPv4/IPv6 addresses (CIDR notation supported)
- ✅ Email addresses (format: user@domain)
- ✅ Domain names (including subdomains)
- ✅ File hashes (MD5, SHA1, SHA256)
- ✅ Social media handles

---

### Tab 2: Intelligence (Enriched Feed)

**Purpose:** Display enriched OSINT and threat intelligence data.

**Layout:**
```
┌─ Filters ──────────────────────────────────────────┐
│ [Source: All ▼] [Type: All ▼] [Date Range: ▼]    │
│ [Search: ________________] [🔍]                    │
└────────────────────────────────────────────────────┘

┌─ Intelligence Feed Table ────────────────────────┐
│ Indicator    │ Type     │ Source   │ Date      │ │
├──────────────┼──────────┼──────────┼───────────┤ │
│ 192.168.1.1  │ IP       │ Shodan   │ 2026-03-19│ │
│ evil.com     │ Domain   │ Censys   │ 2026-03-19│ │
│ attacker@... │ Email    │ Intel-X  │ 2026-03-18│ │
└────────────────────────────────────────────────────┘

[📥 Import] [📤 Export] [🔄 Refresh] [⚙️ Settings]
```

**Features:**
- ✅ Sortable columns (click header)
- ✅ Filterable by source, type, date
- ✅ Search bar (regex supported)
- ✅ Expandable rows (show full details)
- ✅ Batch actions (select multiple rows)
- ✅ Export to CSV/JSON

---

### Tab 3: Operations (Containment Management)

**Purpose:** Manage active quarantines and containment policies.

**Layout:**
```
┌─ Host Isolation Controls ──────────────────────┐
│ Host: [web-server-01________________] 🔍       │
│ Severity: [P1: Critical ▼]                     │
│ Reason: [Ransomware detected_______]           │
│ Duration: [1 hour ▼]                           │
│                                                 │
│ [🛑 Isolate] [⏸️  Pause] [⏹️  Stop]            │
└────────────────────────────────────────────────┘

┌─ Active Quarantines (Real-time) ────────────────┐
│ Host             │ Status    │ TTL      │ Actions│
├──────────────────┼───────────┼──────────┼────────┤
│ web-server-01    │ 🔴 Locked │ 0:58:30  │ ⏹️ ⚙️ │
│ db-server-02     │ 🟡 Monitored│ 1:45:00 │ ⏹️ ⚙️ │
│ app-server-03    │ 🟢 Pending│ 0:05:00  │ ⏹️ ⚙️ │
└────────────────────────────────────────────────┘

[📊 Policy Report] [📋 Audit Log] [⚠️ Alerts]
```

**Status Indicators:**
- 🔴 **Locked:** Complete isolation, no egress
- 🟡 **Monitored:** Allowed traffic logged
- 🟢 **Pending:** Awaiting enforcement
- ⚪ **Expired:** TTL reached, auto-released

**Countdown Example:**
```javascript
// Real-time TTL countdown with WebSocket
socket.on('containment:ttl_update', (data) => {
  setTTL(data.time_remaining);
  // Updates every 1 second
});

// Visual progress bar
<ProgressBar 
  current={ttl_elapsed} 
  max={ttl_total}
  color={ttl_elapsed > ttl_total * 0.8 ? 'red' : 'blue'}
/>
```

---

## Glassmorphism Design System

### Color Palette

```css
/* Primary Colors */
--cyber-blue: #00D9FF;      /* Bright cyber blue */
--cyber-blue-dark: #0099CC;  /* Darker cyber blue */
--danger-red: #FF0040;       /* Alert red */
--warning-yellow: #FFD700;   /* Warning yellow */
--success-green: #00FF41;    /* Success green */

/* Backgrounds */
--glass-bg: rgba(255, 255, 255, 0.08);  /* 8% opacity */
--glass-border: rgba(255, 255, 255, 0.2);  /* 20% opacity */

/* Glassmorphism effect */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 2px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 20px;
}
```

### Typography

```css
/* Headers */
h1 { font-family: 'Courier New', monospace; font-size: 28px; color: var(--cyber-blue); }
h2 { font-family: 'Courier New', monospace; font-size: 22px; color: var(--cyber-blue-dark); }
h3 { font-family: 'Courier New', monospace; font-size: 18px; color: white; }

/* Body */
body { 
  font-family: 'Inter', sans-serif; 
  font-size: 14px; 
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
}

/* Code / Terminal */
code { font-family: 'JetBrains Mono', monospace; color: var(--success-green); }
```

### Shadow Effects

```css
/* Glow effect for cyber appearance */
.glow {
  text-shadow: 0 0 10px var(--cyber-blue);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
}

/* Hover state */
.button:hover {
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.8);
  transform: scale(1.05);
}
```

---

## Real-time Updates

### WebSocket Integration

**Connection Setup:**
```javascript
// frontend/src/hooks/useWarRoomSocket.ts
const useWarRoomSocket = () => {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.REACT_APP_WS_URL}/warroom?token=${token}`
    );
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'attribution:actor_created':
          // Add new threat actor to graph
          addNodeToGraph(data.payload);
          break;
        case 'containment:status_update':
          // Update quarantine status
          updateQuarantineStatus(data.payload);
          break;
        case 'intelligence:feed_update':
          // Add to feed table
          addToIntelligenceFeed(data.payload);
          break;
      }
    };
    
    return () => ws.close();
  }, []);
  
  return socket;
};
```

**Message Types:**
```json
{
  "type": "attribution:actor_created",
  "payload": {
    "actor_id": "TA-12345678",
    "confidence": 0.75,
    "evidence_count": 12
  }
}

{
  "type": "containment:status_update",
  "payload": {
    "host": "web-server-01",
    "status": "LOCKED",
    "ttl_seconds": 3545
  }
}
```

---

## Customization Options

### 1. Dashboard Theme

**User Settings:**
```
⚙️ Settings
├─ Display
│  ├─ Theme: [Dark ✓] [Light] [Auto]
│  ├─ Color Scheme: [Cyber Blue] [Purple] [Green]
│  ├─ Font Size: [Small] [Medium ✓] [Large]
│  └─ Graph Layout: [Force-directed ✓] [Hierarchical] [Circular]
├─ Notifications
│  ├─ Desktop alerts: [On ✓] [Off]
│  ├─ Sound: [On] [Off ✓]
│  └─ Severity filter: [P0 ✓] [P1 ✓] [P2] [P3]
└─ Data
   ├─ Auto-refresh: [On ✓] Every [30 ▼] seconds
   ├─ Graph node limit: [500 ✓]
   └─ Feed retention: [7 days ▼]
```

### 2. Custom Indicators

**Add to Attribution Input:**
```javascript
// Support custom indicator types
const INDICATOR_TYPES = {
  'ipv4': /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  'ipv6': /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/,
  'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  'domain': /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
  'hash': /^[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}$/,
  'custom': /.*/ // User-defined regex
};
```

### 3. Export Options

**Supported Formats:**
```
📤 Export
├─ Dossier PDF (with evidence summary)
├─ CSV (threat actors table)
├─ JSON (full dossier structure)
├─ Neo4j Cypher (query reproducible)
└─ MITRE ATT&CK TTPs (techniques)
```

---

## Performance Optimization

### Graph Rendering (Cytoscape.js)

```javascript
// Optimize for large graphs (>1000 nodes)
const cyConfig = {
  layout: {
    name: 'cose',
    directed: true,
    animate: false,  // Disable for large graphs
    randomize: true,
    avoidOverlap: true,
    nodeSpacing: 10,
    numIter: 100,
    nodeRepulsion: 100,
    nodeAttrraction: 0.5,
    timeout: 5000,
  },
  style: [
    {
      selector: 'node',
      style: {
        'content': 'data(label)',
        'font-size': 12,
        'text-halign': 'center',
        'text-valign': 'center',
        'background-color': '#00D9FF',
        'width': 'label',
        'height': 'label',
        'padding': '5px',
      },
    },
  ],
};
```

### Virtual Scrolling (Intelligence Feed)

```javascript
// Use react-window for large feed lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={intelligenceFeed.length}
  itemSize={40}
  width="100%"
>
  {IntelligenceFeedRow}
</FixedSizeList>
```

---

## Mobile Responsiveness

### Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) {
  .dashboard { display: grid; grid-template-columns: 1fr 1fr 1fr; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .dashboard { display: grid; grid-template-columns: 1fr 1fr; }
  .graph { grid-column: 1 / -1; }
}

/* Mobile */
@media (max-width: 767px) {
  .dashboard { display: flex; flex-direction: column; }
  .tabs { position: fixed; bottom: 0; width: 100%; }
  .graph { height: 300px; }
}
```

---

## Troubleshooting Visual Issues

### Issue: Graph not rendering

```javascript
// Debug: Check graph instance
console.log(cy);
console.log(cy.nodes().length, 'nodes');
console.log(cy.edges().length, 'edges');

// Force re-render
cy.fit();
cy.reset();
```

### Issue: Slow performance with many nodes

```javascript
// Solution 1: Node clustering
const clusters = cy.$('node').makeLayout({
  name: 'cose',
  animate: false,
  avoidOverlap: true,
}).run();

// Solution 2: Pagination
const nodes = cy.$('node').slice(0, 500);  // Show first 500 only
```

### Issue: WebSocket disconnects

```javascript
// Implement reconnection logic
const maxRetries = 5;
let retryCount = 0;

const connectWebSocket = () => {
  const ws = new WebSocket(wsUrl);
  
  ws.onerror = () => {
    if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(connectWebSocket, 1000 * retryCount);  // Exponential backoff
    }
  };
};
```

---

## Quick Reference: Component Map

```
frontend/src/
├─ components/
│  └─ warroom/
│     ├─ CommandDeck.tsx         (Main dashboard container)
│     ├─ BattlefieldTab.tsx      (Threat actor graph)
│     ├─ IntelligenceTab.tsx     (OSINT feed)
│     ├─ OperationsTab.tsx       (Containment controls)
│     ├─ AttributionControl.tsx  (Indicator input)
│     ├─ ContainmentControl.tsx  (Isolation controls)
│     └─ GraphViewer.tsx         (Cytoscape wrapper)
├─ hooks/
│  ├─ useWarRoomSocket.ts        (WebSocket connection)
│  ├─ useAttributionEngine.ts    (API calls)
│  └─ useContainmentService.ts   (Containment API)
└─ theme/
   ├─ colors.ts                  (Cyber blue palette)
   └─ glassmorphism.css          (Glass effect styles)
```

---

**Last Updated:** March 19, 2026  
**Version:** 1.0
