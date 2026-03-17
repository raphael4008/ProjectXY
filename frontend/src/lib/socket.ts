
type WebSocketCallback = (data: any) => void;

class SocketClient {
    private socket: WebSocket | null = null;
    private url: string;
    private listeners: Record<string, WebSocketCallback[]> = {};
    private reconnectInterval: number = 3000;

    constructor() {
        let protocol = 'ws:';
        let hostname = 'localhost';
        if (typeof window !== 'undefined') {
            protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            hostname = window.location.hostname;
        }
        this.url = `${protocol}//${hostname}:8000/api/v1/ws/status`;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log(`[Socket] Connecting to ${this.url}...`);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("[Socket] Connected to Situation Room");
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit(message.type, message.data);
            } catch (e) {
                console.error("[Socket] Failed to parse message", e);
            }
        };

        this.socket.onclose = () => {
            console.log("[Socket] Disconnected. Reconnecting...");
            setTimeout(() => this.connect(), this.reconnectInterval);
        };

        this.socket.onerror = (err) => {
            console.error("[Socket] Error:", err);
            this.socket?.close();
        };
    }

    subscribe(eventType: string, callback: WebSocketCallback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    unsubscribe(eventType: string, callback: WebSocketCallback) {
        if (!this.listeners[eventType]) return;
        this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }

    private emit(eventType: string, data: any) {
        const typeListeners = this.listeners[eventType] || [];
        const allListeners = this.listeners['*'] || []; // Star wildcard

        [...typeListeners, ...allListeners].forEach(cb => cb(data));
    }
}

export const socketClient = new SocketClient();
