import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Layout/Sidebar';
import GlobalHeader from '@/components/Layout/GlobalHeader';
import OmniProbe from '@/components/Layout/OmniProbe';
import CommandPalette from '@/components/Layout/CommandPalette';
import NexusOracle from '@/components/AI/NexusOracle';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
    title: 'ProjectXY | Cyber Intelligence',
    description: 'Advanced Threat Intelligence & Red Team Operations',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`font-sans bg-[#050505] text-white overflow-hidden antialiased`}>
                <AuthProvider>
                    <div className="flex h-screen">
                        {/* Sidebar Navigation */}
                        <div className="hidden lg:block w-64 flex-shrink-0">
                            <Sidebar />
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
                            <GlobalHeader />
                            <CommandPalette />
                            <OmniProbe />
                            <main className="flex-1 overflow-auto pt-16 p-6">
                                {children}
                            </main>
                            <NexusOracle />
                        </div>
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
