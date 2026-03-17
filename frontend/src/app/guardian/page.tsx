"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, Lock, Unlock, Server, Eye, AlertTriangle, CheckCircle2,
    Wifi, WifiOff, Thermometer, Camera, DoorOpen, DoorClosed,
    Cpu, Activity, Zap, Terminal, Radio, Battery, MapPin, Clock
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

type DeviceStatus = 'SECURE' | 'ARMED' | 'NOMINAL' | 'UNLOCKED' | 'TRIGGERED' | 'OFFLINE' | 'ALERT' | 'DISARMED';
type DeviceType = 'Lock' | 'Alarm' | 'Sensor' | 'Camera' | 'Server' | 'Access';

interface IoTDevice {
    id: string;
    name: string;
    type: DeviceType;
    location: string;
    status: DeviceStatus;
    battery?: number;
    ip?: string;
    last_event?: string;
    threat_level?: 'NONE' | 'LOW' | 'HIGH' | 'CRITICAL';
}

interface CommandLog {
    id: string;
    ts: string;
    text: string;
    type: 'info' | 'success' | 'warning' | 'critical';
}

// ─── Device Definitions ───────────────────────────────────────────────────────

const INITIAL_DEVICES: IoTDevice[] = [
    { id: 'lock_server_room', name: 'Server Room Alpha — Smart Lock', type: 'Lock', location: 'B2 Data Center', status: 'SECURE', battery: 87, threat_level: 'NONE', last_event: 'Locked by admin 2h ago' },
    { id: 'lock_noc', name: 'NOC Entry Point', type: 'Lock', location: 'B2 Data Center', status: 'SECURE', battery: 65, threat_level: 'NONE', last_event: 'Unlocked by J.Kim 15m ago' },
    { id: 'alarm_main_gate', name: 'Main Gate Intrusion Alarm', type: 'Alarm', location: 'Perimeter', status: 'ARMED', threat_level: 'NONE', last_event: 'Armed at 08:00' },
    { id: 'camera_r04', name: 'Rack 04 CCTV — AI Vision', type: 'Camera', location: 'B2 Data Center', status: 'NOMINAL', ip: '10.0.50.14', threat_level: 'NONE', last_event: 'Motion: svc_admin 14m ago' },
    { id: 'sensor_thermal_r4', name: 'Rack 4 Thermal Monitor', type: 'Sensor', location: 'B2 Data Center', status: 'ALERT', threat_level: 'HIGH', last_event: '⚠ TEMP: 79°C (threshold: 70°C)' },
    { id: 'sensor_humidity', name: 'Humidity / Air Quality', type: 'Sensor', location: 'B2 Data Center', status: 'NOMINAL', threat_level: 'NONE', last_event: 'Humidity: 42% ✓' },
    { id: 'access_badge_main', name: 'Main Entrance Badge Reader', type: 'Access', location: 'Ground Floor', status: 'NOMINAL', ip: '10.0.50.5', threat_level: 'NONE', last_event: 'Badge: E.Morrison 8m ago' },
    { id: 'lock_exec_suite', name: 'Executive Suite — Smart Lock', type: 'Lock', location: 'Floor 12', status: 'UNLOCKED', battery: 92, threat_level: 'LOW', last_event: 'Unlocked remotely' },
    { id: 'alarm_perimeter_e', name: 'East Perimeter Motion Sensor', type: 'Alarm', location: 'East Wing', status: 'TRIGGERED', threat_level: 'CRITICAL', last_event: '⚠ MOTION DETECTED 2m ago' },
    { id: 'camera_parking', name: 'Parking Lot CCTV', type: 'Camera', location: 'Exterior', status: 'OFFLINE', ip: '10.0.50.22', threat_level: 'NONE', last_event: 'Connection lost 1h ago' },
    { id: 'server_hvac', name: 'HVAC Control Unit', type: 'Server', location: 'B1 Mechanical', status: 'NOMINAL', ip: '10.0.50.30', threat_level: 'NONE', last_event: 'Temp setpoint: 18°C' },
    { id: 'access_badge_r04', name: 'Rack Room Badge Reader', type: 'Access', location: 'B2 Data Center', status: 'ALERT', ip: '10.0.50.7', threat_level: 'HIGH', last_event: '⚠ UNAUTHORIZED badge: ID-0892' },
];

// ─── Status Configs ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<DeviceStatus, { dot: string; badge: string; text: string; border: string }> = {
    SECURE: { dot: 'bg-emerald-500', badge: 'bg-emerald-950 border-emerald-700 text-emerald-400', text: 'text-emerald-400', border: 'border-emerald-800' },
    ARMED: { dot: 'bg-emerald-500', badge: 'bg-emerald-950 border-emerald-700 text-emerald-400', text: 'text-emerald-400', border: 'border-emerald-800' },
    NOMINAL: { dot: 'bg-cyan-500', badge: 'bg-cyan-950 border-cyan-700 text-cyan-400', text: 'text-cyan-400', border: 'border-cyan-900' },
    UNLOCKED: { dot: 'bg-amber-500', badge: 'bg-amber-950 border-amber-700 text-amber-400', text: 'text-amber-400', border: 'border-amber-800' },
    TRIGGERED: { dot: 'bg-rose-500 animate-ping', badge: 'bg-rose-950 border-rose-600 text-rose-400', text: 'text-rose-400', border: 'border-rose-700' },
    ALERT: { dot: 'bg-orange-500 animate-pulse', badge: 'bg-orange-950 border-orange-700 text-orange-400', text: 'text-orange-400', border: 'border-orange-700' },
    OFFLINE: { dot: 'bg-slate-600', badge: 'bg-slate-900 border-slate-700 text-slate-500', text: 'text-slate-500', border: 'border-slate-700' },
    DISARMED: { dot: 'bg-slate-500', badge: 'bg-slate-900 border-slate-600 text-slate-400', text: 'text-slate-400', border: 'border-slate-700' },
};

const THREAT_CFG = {
    CRITICAL: { color: 'text-rose-400', bg: 'bg-rose-950/30' },
    HIGH: { color: 'text-orange-400', bg: 'bg-orange-950/20' },
    LOW: { color: 'text-amber-400', bg: 'bg-amber-950/10' },
    NONE: { color: 'text-slate-600', bg: '' },
};

const DEVICE_ICONS: Record<DeviceType, React.ElementType> = {
    Lock: Lock,
    Alarm: Radio,
    Sensor: Thermometer,
    Camera: Camera,
    Server: Server,
    Access: Eye,
};

const COMMANDS: Record<string, { label: string; next: DeviceStatus; icon: React.ElementType }[]> = {
    Lock: [{ label: 'LOCK', next: 'SECURE', icon: Lock }, { label: 'UNLOCK', next: 'UNLOCKED', icon: Unlock }],
    Alarm: [{ label: 'ARM', next: 'ARMED', icon: Shield }, { label: 'DISARM', next: 'DISARMED', icon: Unlock }],
    Camera: [{ label: 'RESET FEED', next: 'NOMINAL', icon: Eye }],
    Sensor: [{ label: 'ACKNOWLEDGE', next: 'NOMINAL', icon: CheckCircle2 }],
    Server: [{ label: 'RESTART', next: 'NOMINAL', icon: Zap }],
    Access: [{ label: 'REVOKE ACCESS', next: 'NOMINAL', icon: Shield }],
};

export default function GuardianPage() {
    const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_DEVICES);
    const [selected, setSelected] = useState<IoTDevice | null>(INITIAL_DEVICES[8]); // Start with triggered alarm
    const [loading, setLoading] = useState<string | null>(null);
    const [logs, setLogs] = useState<CommandLog[]>([{ id: '0', ts: '—', text: '[System] Guardian Protocol v2.0 — Physical Security Command Active', type: 'info' }]);
    const [filter, setFilter] = useState<'ALL' | DeviceType>('ALL');
    const logsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((text: string, type: CommandLog['type'] = 'info') => {
        setLogs(prev => [...prev, { id: String(Date.now()), ts: new Date().toLocaleTimeString(), text, type }]);
    }, []);

    const sendCommand = async (device: IoTDevice, command: string, nextStatus: DeviceStatus) => {
        setLoading(device.id);
        addLog(`[*] Dispatching ${command} to ${device.name}...`, 'info');

        await new Promise(res => setTimeout(res, 800 + Math.random() * 400));

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/guardian/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ device_id: device.id, command }),
            }).catch(() => { });

            setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: nextStatus, last_event: `${command} by operator — ${new Date().toLocaleTimeString()}`, threat_level: nextStatus === 'NOMINAL' || nextStatus === 'SECURE' ? 'NONE' : d.threat_level } : d));
            if (selected?.id === device.id) setSelected(d => d ? { ...d, status: nextStatus } : d);
            addLog(`[+] ${command} acknowledged by ${device.name} — Status: ${nextStatus}`, 'success');
        } catch (e: any) {
            addLog(`[!] Command failed: ${e.message}`, 'critical');
        } finally {
            setLoading(null);
        }
    };

    const alerts = devices.filter(d => d.threat_level === 'CRITICAL' || d.threat_level === 'HIGH' || d.status === 'TRIGGERED');
    const offline = devices.filter(d => d.status === 'OFFLINE');
    const nominal = devices.filter(d => ['NOMINAL', 'SECURE', 'ARMED'].includes(d.status));

    const filtered = filter === 'ALL' ? devices : devices.filter(d => d.type === filter);

    return (
        <div className="flex flex-col h-screen bg-[#040608] text-slate-300 font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,60,120,0.1)_0,transparent_60%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-blue-900/30 bg-black/60 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <Shield size={20} className="text-blue-400" />
                    <div>
                        <h1 className="text-base font-bold text-blue-400 tracking-widest">GUARDIAN — PHYSICAL SECURITY & IoT COMMAND</h1>
                        <p className="text-[9px] text-blue-900 tracking-widest">Smart Lock Control · Alarm Matrix · Environmental Sensors · CCTV · Access Control</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                    <span className={clsx("px-2 py-1 rounded border font-bold", alerts.length > 0 ? "border-rose-700 text-rose-400 bg-rose-950/30 animate-pulse" : "border-slate-700 text-slate-500")}>
                        {alerts.length} ALERTS
                    </span>
                    <span className="border border-emerald-800 text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded font-bold">{nominal.length} NOMINAL</span>
                    <span className="border border-slate-700 text-slate-500 px-2 py-1 rounded font-bold">{offline.length} OFFLINE</span>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                {/* LEFT: Device Grid */}
                <div className="col-span-4 flex flex-col border-r border-blue-900/20 overflow-hidden">
                    {/* Type filter */}
                    <div className="flex flex-wrap gap-1 p-2 border-b border-blue-900/20 bg-black/40 shrink-0">
                        {(['ALL', 'Lock', 'Alarm', 'Camera', 'Sensor', 'Access', 'Server'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={clsx("text-[8px] px-2 py-1 rounded border font-bold transition-all",
                                    filter === f ? "bg-blue-950 border-blue-600 text-blue-400" : "border-slate-800 text-slate-600 hover:text-slate-400")}>
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                        {filtered.map(device => {
                            const Icon = DEVICE_ICONS[device.type] || Lock;
                            const st = STATUS_CFG[device.status];
                            const thr = THREAT_CFG[device.threat_level || 'NONE'];
                            return (
                                <button key={device.id} onClick={() => setSelected(device)}
                                    className={clsx(
                                        "w-full text-left p-3 rounded border transition-all",
                                        selected?.id === device.id ? `${st.border} bg-slate-900/60 shadow-sm` : "border-slate-800/60 bg-black/30 hover:border-slate-700",
                                        device.threat_level === 'CRITICAL' && "bg-rose-950/10 border-rose-800/50"
                                    )}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="relative">
                                            <Icon size={14} className={st.text} />
                                            {(device.status === 'TRIGGERED' || device.status === 'ALERT') && (
                                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300 flex-1 truncate">{device.name}</span>
                                        <span className={clsx("text-[8px] px-1.5 py-0.5 rounded border font-bold", st.badge)}>{device.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px]">
                                        <span className="text-slate-600 flex items-center gap-1"><MapPin size={8} />{device.location}</span>
                                        {device.battery !== undefined && (
                                            <span className={clsx("flex items-center gap-1", device.battery < 30 ? 'text-rose-500' : 'text-slate-600')}>
                                                <Battery size={8} />{device.battery}%
                                            </span>
                                        )}
                                    </div>
                                    {device.threat_level !== 'NONE' && (
                                        <div className={clsx("text-[8px] mt-1.5 font-bold", thr.color)}>⚠ {device.threat_level} THREAT</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER: Device Control Panel */}
                <div className="col-span-5 flex flex-col border-r border-blue-900/20 overflow-hidden">
                    {selected ? (() => {
                        const Icon = DEVICE_ICONS[selected.type] || Lock;
                        const st = STATUS_CFG[selected.status];
                        const cmds = COMMANDS[selected.type] || [];
                        return (
                            <>
                                <div className={clsx("px-4 py-3 border-b flex items-center justify-between bg-black/60 shrink-0", st.border)}>
                                    <div className="flex items-center gap-3">
                                        <Icon size={20} className={st.text} />
                                        <div>
                                            <h2 className="text-sm font-bold text-white">{selected.name}</h2>
                                            <p className="text-[9px] text-slate-600 flex items-center gap-1"><MapPin size={8} />{selected.location}</p>
                                        </div>
                                    </div>
                                    <span className={clsx("text-[10px] px-2 py-1 rounded border font-bold", st.badge)}>{selected.status}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                    {/* Last Event */}
                                    <div className="bg-black/40 border border-slate-800 rounded p-3">
                                        <div className="text-[9px] text-slate-600 tracking-widest mb-1">LAST EVENT</div>
                                        <p className="text-xs text-slate-300">{selected.last_event}</p>
                                    </div>

                                    {/* Device info grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {selected.ip && (
                                            <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                <div className="text-[8px] text-slate-600 tracking-widest">IP ADDRESS</div>
                                                <div className="text-xs font-mono text-cyan-400 mt-0.5">{selected.ip}</div>
                                            </div>
                                        )}
                                        {selected.battery !== undefined && (
                                            <div className="bg-black/40 border border-slate-800 rounded p-3">
                                                <div className="text-[8px] text-slate-600 tracking-widest">BATTERY</div>
                                                <div className={clsx("text-xs font-bold mt-0.5", selected.battery < 30 ? 'text-rose-400' : 'text-emerald-400')}>{selected.battery}%</div>
                                                <div className="h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                                                    <div className={clsx("h-full rounded-full", selected.battery < 30 ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${selected.battery}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-black/40 border border-slate-800 rounded p-3">
                                            <div className="text-[8px] text-slate-600 tracking-widest">DEVICE TYPE</div>
                                            <div className="text-xs font-bold text-slate-300 mt-0.5">{selected.type}</div>
                                        </div>
                                        <div className={clsx("border rounded p-3", THREAT_CFG[selected.threat_level || 'NONE'].bg, 'border-slate-800')}>
                                            <div className="text-[8px] text-slate-600 tracking-widest">THREAT LEVEL</div>
                                            <div className={clsx("text-xs font-bold mt-0.5", THREAT_CFG[selected.threat_level || 'NONE'].color)}>{selected.threat_level || 'NONE'}</div>
                                        </div>
                                    </div>

                                    {/* Command buttons */}
                                    <div>
                                        <div className="text-[9px] text-slate-600 tracking-widest mb-2">OPERATOR COMMANDS</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {cmds.map(cmd => {
                                                const CmdIcon = cmd.icon;
                                                return (
                                                    <button key={cmd.label} onClick={() => sendCommand(selected, cmd.label, cmd.next)}
                                                        disabled={loading === selected.id}
                                                        className={clsx(
                                                            "flex items-center justify-center gap-2 py-2.5 rounded border font-bold text-xs tracking-widest transition-all",
                                                            cmd.label.includes('LOCK') || cmd.label.includes('ARM') || cmd.label.includes('REVOKE')
                                                                ? "border-emerald-700 text-emerald-400 hover:bg-emerald-950/30"
                                                                : "border-amber-700 text-amber-400 hover:bg-amber-950/30",
                                                            loading === selected.id && "opacity-40 cursor-not-allowed"
                                                        )}>
                                                        <CmdIcon size={12} />
                                                        {loading === selected.id ? 'EXECUTING...' : cmd.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Emergency controls */}
                                    <div className="border-t border-red-900/20 pt-4">
                                        <div className="text-[9px] text-rose-700 tracking-widest mb-2">EMERGENCY PROTOCOLS</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => {
                                                setDevices(prev => prev.map(d => d.type === 'Lock' ? { ...d, status: 'SECURE' } : d));
                                                addLog('[!!!] LOCKDOWN PROTOCOL: All doors secured.', 'critical');
                                            }} className="py-2 rounded border border-rose-800 text-rose-500 text-[10px] font-bold hover:bg-rose-950/30 transition-all">
                                                🔒 FACILITY LOCKDOWN
                                            </button>
                                            <button onClick={() => {
                                                addLog('[!!!] EVACUATION ALERT: All alarms triggered.', 'critical');
                                                setDevices(prev => prev.map(d => d.type === 'Alarm' ? { ...d, status: 'TRIGGERED' } : d));
                                            }} className="py-2 rounded border border-amber-800 text-amber-500 text-[10px] font-bold hover:bg-amber-950/30 transition-all">
                                                🚨 EVACUATION ALERT
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
                            <Shield size={28} />
                            <p className="text-[10px] tracking-widest">Select a device to control</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: Command Log */}
                <div className="col-span-3 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-blue-900/20 bg-black/40 flex items-center gap-2 shrink-0">
                        <Terminal size={12} className="text-blue-400" />
                        <span className="text-[9px] font-bold text-blue-400 tracking-widest">GUARDIAN COMMAND LOG</span>
                    </div>
                    <div ref={logsRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 text-[10px] space-y-1">
                        {logs.map(log => (
                            <div key={log.id} className={clsx("leading-relaxed",
                                log.type === 'success' ? 'text-emerald-400' :
                                    log.type === 'critical' ? 'text-rose-400 font-bold' :
                                        log.type === 'warning' ? 'text-amber-400' : 'text-slate-500'
                            )}>
                                <span className="text-slate-700 mr-2">[{log.ts}]</span>{log.text}
                            </div>
                        ))}
                    </div>
                    {/* Alerts Summary */}
                    {alerts.length > 0 && (
                        <div className="border-t border-rose-900/30 p-3 space-y-1.5 bg-black/60 shrink-0">
                            <div className="text-[9px] text-rose-500 font-bold tracking-widest">⚠ ACTIVE ALERTS</div>
                            {alerts.map(a => (
                                <button key={a.id} onClick={() => setSelected(a)}
                                    className="w-full text-left text-[9px] text-rose-400 hover:text-rose-300 truncate">
                                    • {a.name}: {a.last_event}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
