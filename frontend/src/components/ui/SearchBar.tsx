'use client';

import { Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) {
            setLoading(true);
            try {
                // For now, simpler exact match search or redirect to first optional result
                // Ideally this would be a full search page, but for MVP let's checks if it's an ID or name
                // Basic implementation: Navigate to entity if it looks like an ID, otherwise search
                // Since our API has basic list with filters, we will just assume the user knows IDs for the MVP 
                // OR we fetch entities and find a match.

                // Let's assume for this "Wiring Phase" we direct to the ID if it matches UUID format,
                // otherwise we might need a search results page.
                // To keep it simple: We will do a client-side filter of the entities list for the query name
                // taking the first match (Naive Search)
                const entities = await api.getEntities();
                const match = entities.find(e =>
                    e.canonical_name.toLowerCase().includes(query.toLowerCase()) ||
                    e.id === query
                );

                if (match) {
                    router.push(`/dashboard/entity/${match.id}`);
                } else {
                    alert("No entities found matching that query.");
                }

            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {loading ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                    <Search className="h-5 w-5 text-primary opacity-70 group-focus-within:opacity-100 transition-opacity" />
                )}
            </div>
            <input
                type="text"
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 
                   text-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 
                   focus:ring-2 focus:ring-primary/20 transition-all font-mono backdrop-blur-sm"
                placeholder="Enter Entity Name (e.g., 'Target_Alpha') or ID and press Enter..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                disabled={loading}
            />

            {/* Search Hints */}
            <div className="absolute -bottom-6 left-2 flex gap-4 text-xs text-gray-400 font-mono">
                <span>Try: "admin"</span>
                <span>•</span>
                <span>or an existing ID</span>
            </div>
        </div>
    );
}
