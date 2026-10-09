import { FullSystemState } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private onStateCallback: ((state: FullSystemState) => void) | null = null;
  private onStatusCallback: ((connected: boolean) => void) | null = null;
  private reconnectTimer: any = null;

  connect(
    onState: (state: FullSystemState) => void,
    onStatus: (connected: boolean) => void
  ) {
    this.onStateCallback = onState;
    this.onStatusCallback = onStatus;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/stream`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusCallback?.(true);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.scenario_id) {
            this.onStateCallback?.(data as FullSystemState);
          }
        } catch (err) {
          // Non-json ping/pong
        }
      };

      this.ws.onclose = () => {
        this.onStatusCallback?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.onStatusCallback?.(false);
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.onStateCallback && this.onStatusCallback) {
        this.connect(this.onStateCallback, this.onStatusCallback);
      }
    }, 4000);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsService = new WebSocketService();

export function initWebSocket() {
  return wsService;
}
