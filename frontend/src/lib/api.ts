const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
    email: string;
    full_name: string;
    role: string;
}

export interface Entity {
    id: string;
    canonical_name: string;
    type: string;
    risk_score: number;
    attributes: any[];
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    loadToken() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as any) || {}),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle logical logout
                console.warn("Unauthorized: Token may be expired");
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    // --- Auth ---
    async login(username: string, password: string): Promise<AuthResponse> {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const data = await this.request<AuthResponse>('/login/access-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });

        this.setToken(data.access_token);
        return data;
    }

    // --- Entities ---
    async getEntities(type?: string): Promise<Entity[]> {
        const query = type ? `?type=${type}` : '';
        return this.request<Entity[]>(`/entities/${query}`);
    }

    async getEntity(id: string): Promise<Entity> {
        return this.request<Entity>(`/entities/${id}`);
    }

    // --- Analysis ---
    async getRiskAnalysis(id: string): Promise<any> {
        return this.request<any>(`/analysis/risk/${id}`);
    }

    async getGraphNeighborhood(id: string): Promise<any> {
        return this.request<any>(`/analysis/graph/neighborhood/${id}`);
    }

    async getAISummary(id: string): Promise<{ summary: string }> {
        return this.request<{ summary: string }>(`/analysis/ai/summary/${id}`);
    }

    // --- Stats ---
    async getStats(): Promise<{ pipeline: string; nodes: string; active_breaches: number }> {
        return this.request<{ pipeline: string; nodes: string; active_breaches: number }>('/stats/');
    }
}

export const api = new ApiClient();
