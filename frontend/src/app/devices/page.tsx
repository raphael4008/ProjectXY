'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Map, Smartphone, Tablet, Monitor, Crosshair, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AssetRecoveryPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        setLoading(true);
        try {
            const data = await api.getDevices();
            setDevices(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getDeviceIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'mobile': return <Smartphone size={16} />;
            case 'tablet': return <Tablet size={16} />;
            default: return <Monitor size={16} />;
        }
    };

    return (
        <div className="grid grid-cols-12 h-screen gap-6 p-6 bg-[#050505] text-white overflow-hidden">

            {/* Device List Sidebar */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-red-500 font-mono tracking-wider">ASSET RECOVERY</h1>
                        <p className="text-xs text-gray-500 uppercase">Device Tracking & Forensics</p>
                    </div>
                    <button onClick={loadDevices} className="p-2 bg-[#1f1f1f] rounded hover:bg-[#2d2d2d] transition-colors">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {loading ? (
                        <div className="text-center py-10 text-gray-500 font-mono">SCANNING NETWORK...</div>
                    ) : devices.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 font-mono">NO DEVICES FOUND</div>
                    ) : (
                        devices.map(device => (
                            <div
                                key={device.id}
                                onClick={() => setSelectedDevice(device)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedDevice?.id === device.id
                                    ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                    : 'bg-[#0a0a0a] border-[#1f1f1f] hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        {getDeviceIcon(device.type)}
                                        <span className="font-bold">{device.name}</span>
                                    </div>
                                    {device.active_trace && (
                                        <div className="flex items-center gap-1 text-red-500 text-xs font-bold animate-pulse">
                                            <Crosshair size={12} />
                                            TRACE ACTIVE
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-500">
                                    <div>ID: {device.id.substring(0, 8)}...</div>
                                    <div>LAST SEEN: {new Date(device.last_seen || Date.now()).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="col-span-12 lg:col-span-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl relative overflow-hidden group">
                {/* Map Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,30,30,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,30,30,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

                {/* World Map Overlay (Placeholder) */}
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] opacity-10 bg-cover bg-center grayscale invert mix-blend-overlay"></div>

                {selectedDevice ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Target Locater */}
                        <div className="relative">
                            <div className="w-[400px] h-[400px] border border-red-900/30 rounded-full animate-ping absolute -top-[190px] -left-[190px]"></div>
                            <div className="w-[300px] h-[300px] border border-red-800/40 rounded-full absolute -top-[140px] -left-[140px]"></div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="relative">
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <Map size={32} className="text-red-500" />
                                </div>
                                <div className="bg-black/80 backdrop-blur border border-red-900/50 p-2 rounded text-center">
                                    <div className="text-red-500 font-bold text-sm tracking-widest">{selectedDevice.name.toUpperCase()}</div>
                                    <div className="text-xs font-mono text-gray-400">
                                        LAT: {selectedDevice.latitude?.toFixed(4) ?? '---'} | LON: {selectedDevice.longitude?.toFixed(4) ?? '---'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-gray-600">
                        <GlobeIcon />
                        <p className="font-mono tracking-widest text-sm">SELECT A DEVICE TO INITIATE TRACE</p>
                    </div>
                )}

                {/* HUD Overlay */}
                <div className="absolute bottom-6 right-6">
                    <div className="flex gap-4 text-xs font-mono text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            ACTIVE
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            OFFLINE
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

const GlobeIcon = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
)
