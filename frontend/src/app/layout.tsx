import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
    title: "Cyber Intel | ProjectXY",
    description: "Lawful OSINT Analysis Platform",
};

import { AuthProvider } from "@/components/providers/AuthProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} ${jetbrains.variable} bg-background text-gray-100 font-sans antialiased overflow-hidden`}>
                <AuthProvider>
                    <div className="flex h-screen w-screen relative">
                        {/* Global Background Grid/Micro-interactions can go here */}
                        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-10 pointer-events-none z-0"></div>

                        <main className="z-10 w-full h-full flex flex-col">
                            {children}
                        </main>
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
