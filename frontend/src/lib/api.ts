let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined') {
    API_URL = `http://${window.location.hostname}:8000/api/v1`;
}

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

    // --- Devices ---
    async updateDevice(id: string, data: any): Promise<any> {
        return this.request<any>(`/devices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getDevices(): Promise<any[]> {
        return this.request<any[]>('/devices/');
    }

    // --- Analysis ---
    async getRiskAnalysis(id: string): Promise<any> {
        return this.request<any>(`/analysis/risk/${id}`);
    }

    async getGraphNeighborhood(id: string): Promise<any> {
        return this.request<any>(`/analysis/graph/neighborhood/${id}`);
    }

    async getGraph(): Promise<any> {
        return this.request<any>(`/analysis/graph/full`);
    }

    async getAISummary(id: string): Promise<{ summary: string }> {
        return this.request<{ summary: string }>(`/analysis/ai/summary/${id}`);
    }

    // --- Stats ---
    async getStats(): Promise<any> {
        return this.request<any>('/stats/');
    }

    // --- Tactical AI ---
    async getSentinelStatus(): Promise<any> {
        return this.request<any>('/ai/sentinel/status');
    }

    async generateScenario(difficulty: string): Promise<any> {
        return this.request<any>(`/ai/nemesis/generate-scenario?difficulty=${difficulty}`, {
            method: 'POST'
        });
    }

    async getTacticalFeed(): Promise<any[]> {
        return this.request<any[]>('/ai/feed/merged');
    }

    // --- AI Analyst ---
    async chatWithAnalyst(entityId: string, question: string): Promise<{ response: string }> {
        return this.request<{ response: string }>('/analyst/chat', {
            method: 'POST',
            body: JSON.stringify({ entity_id: entityId, question })
        });
    }

    async investigateEntity(entityId: string): Promise<any> {
        return this.request<any>(`/analyst/investigate/${entityId}`);
    }

    // --- Global Connectors ---
    async searchOSINT(query: string): Promise<any[]> {
        return this.request<any[]>(`/connectors/osint/search?query=${encodeURIComponent(query)}`);
    }

    // --- NL Interface ---
    async search(query: string): Promise<any> {
        return this.request<any>('/analysis/search', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    // --- Guardian IoT ---
    async getIoTDevices(): Promise<any[]> {
        return this.request<any[]>('/guardian/devices');
    }

    async sendIoTCommand(deviceId: string, command: string): Promise<any> {
        return this.request<any>('/guardian/command', {
            method: 'POST',
            body: JSON.stringify({ device_id: deviceId, command })
        });
    }

    // --- Cryptographic Audit Ledger ---
    async getAuditLogs(skip = 0, limit = 100): Promise<any[]> {
        return this.request<any[]>(`/audit/logs?skip=${skip}&limit=${limit}`);
    }

    async verifyAuditChain(): Promise<any> {
        return this.request<any>('/audit/verify', { method: 'POST' });
    }

    // --- Unified Intelligence Chain ---
    async launchMission(target: string): Promise<any> {
        return this.request<any>('/missions/launch', {
            method: 'POST',
            body: JSON.stringify({ target })
        });
    }

    async getMission(missionId: string): Promise<any> {
        return this.request<any>(`/missions/${missionId}`);
    }

    // --- Vanguard Cyber Command (Tier 1-7) ---
    async scanOmniProbe(targetCidr: string): Promise<any> {
        return this.request<any>('/recon/scan', {
            method: 'POST',
            body: JSON.stringify({ target_cidr: targetCidr, scan_type: 'FULL_SPECTRUM' })
        });
    }

    async quarantineNode(targetIp: string): Promise<any> {
        return this.request<any>('/sandbox/quarantine', {
            method: 'POST',
            body: JSON.stringify({ target_ip: targetIp })
        });
    }

    async synthesizeExploit(targetProfile: any): Promise<any> {
        return this.request<any>('/offensive/aeg/synthesize', {
            method: 'POST',
            body: JSON.stringify({ target_profile: targetProfile })
        });
    }

    async generatePQCKeys(): Promise<any> {
        return this.request<any>('/forge/pqc/generate');
    }

    async predictThreats(): Promise<any> {
        return this.request<any>('/oracle/predict_threats', {
            method: 'POST',
            body: JSON.stringify({ region: 'GLOBAL', timeframe_hours: 72 })
        });
    }
}

export const api = new ApiClient();
api.loadToken();
