'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commands = [
        { name: 'Engage Containment Sandbox', action: () => console.log('CONTAINMENT') },
        { name: 'Toggle Executive Heatmap', action: () => console.log('EXECUTIVE MODE') },
        { name: 'Initiate Incident Replay', action: () => console.log('REPLAY') },
        { name: 'Deploy Deception Honeypot', action: () => console.log('HONEYPOTDEPLOY') },
        { name: 'Export Compliance Audit Log', action: () => console.log('EXPORT') },
        { name: 'View Device Inventory', action: () => router.push('/devices') }
    ];

    const filteredCommands = query === ''
        ? commands
        : commands.filter((command) =>
            command.name.toLowerCase().includes(query.toLowerCase())
        );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-[#0A0A0A] border border-cyan-800/50 rounded shadow-2xl overflow-hidden text-gray-200 font-mono">
                <div className="p-4 border-b border-cyan-900/40">
                    <input
                        type="text"
                        className="w-full bg-transparent text-xl outline-none placeholder-gray-600 text-cyan-400"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {filteredCommands.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">No commands found.</div>
                    ) : (
                        <ul className="py-2">
                            {filteredCommands.map((command, idx) => (
                                <li
                                    key={idx}
                                    className="px-4 py-3 hover:bg-cyan-900/30 cursor-pointer text-sm border-l-2 border-transparent hover:border-cyan-500 transition-colors"
                                    onClick={() => {
                                        command.action();
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                >
                                    <span className="text-gray-400 mr-3">{'>'}</span>
                                    {command.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-2 border-t border-gray-800/50 text-xs text-gray-600 flex justify-between bg-[#050505]">
                    <span>Use ↑/↓ navigation and ↵ Enter</span>
                    <span>ESC to close</span>
                </div>
            </div>
        </div>
    );
};
