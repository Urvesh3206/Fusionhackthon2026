import { useState, useEffect, useRef, useCallback } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { OfflineSOSPacket, offlineMeshNetwork } from '../services/offlineMeshNetwork';

export interface WebRTCMeshState {
  myPeerId: string;
  isReady: boolean;
  activeConnectionsCount: number;
  lastReceivedPacket: OfflineSOSPacket | null;
  lastAckPacket: OfflineSOSPacket | null;
  connectionMode: 'P2P_WEBRTC' | 'LOCAL_MESH_BROADCAST';
}

export const ADMIN_PEER_ID = 'resqgrid-admin-triage-node';

export function useWebRTCMesh(role: 'PATIENT' | 'ADMIN', customPeerId?: string) {
  const [peerId, setPeerId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [activeConnections, setActiveConnections] = useState<DataConnection[]>([]);
  const [lastReceivedPacket, setLastReceivedPacket] = useState<OfflineSOSPacket | null>(null);
  const [lastAckPacket, setLastAckPacket] = useState<OfflineSOSPacket | null>(null);
  const [connectionMode, setConnectionMode] = useState<'P2P_WEBRTC' | 'LOCAL_MESH_BROADCAST'>('LOCAL_MESH_BROADCAST');

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for Zero-Server Local Mesh Fallback
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('resqgrid_webrtc_mesh_channel');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === 'SOS_PAYLOAD') {
            setLastReceivedPacket(event.data.payload);
          } else if (event.data?.type === 'DISPATCH_ACCEPTED') {
            setLastAckPacket(event.data.payload);
          }
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel fallback warning:', err);
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Initialize WebRTC Peer connection
  useEffect(() => {
    const assignedId = customPeerId || (role === 'ADMIN' ? ADMIN_PEER_ID : `patient-${Math.floor(Math.random() * 90000 + 10000)}`);
    setPeerId(assignedId);

    try {
      // Initialize PeerJS with public STUN & fallback options
      const peer = new Peer(assignedId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        },
        debug: 1
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        setIsReady(true);
        setConnectionMode('P2P_WEBRTC');
      });

      // Admin Listener: Handle incoming data connections from patient peers
      peer.on('connection', (conn) => {
        setupConnectionListeners(conn);
      });

      peer.on('error', (err) => {
        console.warn('WebRTC Peer warning (operating in resilient local mesh mode):', err.type);
        setIsReady(true); // Still ready in local mesh mode
        setConnectionMode('LOCAL_MESH_BROADCAST');
      });

      return () => {
        peer.destroy();
      };
    } catch (e) {
      console.warn('WebRTC direct initialization fallback:', e);
      setIsReady(true);
      setConnectionMode('LOCAL_MESH_BROADCAST');
    }
  }, [role, customPeerId]);

  const setupConnectionListeners = (conn: DataConnection) => {
    conn.on('open', () => {
      connectionsRef.current.set(conn.peer, conn);
      setActiveConnections(Array.from(connectionsRef.current.values()));

      conn.on('data', (data: any) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (parsed.type === 'SOS_PAYLOAD') {
            setLastReceivedPacket(parsed.payload);
          } else if (parsed.type === 'DISPATCH_ACCEPTED') {
            setLastAckPacket(parsed.payload);
          }
        } catch (e) {
          console.error('DataChannel parse error:', e);
        }
      });
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setActiveConnections(Array.from(connectionsRef.current.values()));
    });
  };

  // Broadcast SOS Packet over WebRTC DataChannel, Local Mesh & Storage
  const sendSOSPacket = useCallback((packet: OfflineSOSPacket) => {
    // 1. Save to resilient offlineMesh storage
    offlineMeshNetwork.savePacketToStorage(packet);

    // 2. Send via active WebRTC DataChannels to Admin Node
    if (peerRef.current && role === 'PATIENT') {
      try {
        const conn = peerRef.current.connect(ADMIN_PEER_ID, { reliable: true });
        conn.on('open', () => {
          conn.send(JSON.stringify({ type: 'SOS_PAYLOAD', payload: packet }));
          setupConnectionListeners(conn);
        });
      } catch (err) {
        console.warn('WebRTC direct conn attempt:', err);
      }
    }

    // 3. Broadcast across all active open data connections
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(JSON.stringify({ type: 'SOS_PAYLOAD', payload: packet }));
        } catch { /* ignore */ }
      }
    });

    // 4. Broadcast across Local BroadcastChannel (Zero-Server P2P Mesh)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'SOS_PAYLOAD', payload: packet });
      } catch { /* ignore */ }
    }

    // 5. Send to shared backend for Cloudflare & cross-device delivery
    try {
      fetch('/api/emergency/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet)
      }).catch(() => {});
    } catch { /* offline fallback */ }

    // 6. Update local state
    setLastReceivedPacket(packet);
  }, [role]);

  // Admin sends Acknowledgment / Dispatch confirmation back to Patient
  const sendAcknowledgment = useCallback((ackPacket: OfflineSOSPacket) => {
    const payload = {
      ...ackPacket,
      status: 'EN_ROUTE' as const
    };

    // 1. Save to offline storage
    offlineMeshNetwork.savePacketToStorage(payload);

    // 2. Send over WebRTC DataChannel
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(JSON.stringify({ type: 'DISPATCH_ACCEPTED', payload }));
        } catch { /* ignore */ }
      }
    });

    // 3. Broadcast via local mesh channel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: 'DISPATCH_ACCEPTED', payload });
      } catch { /* ignore */ }
    }

    // 4. Update local state
    setLastAckPacket(payload);
  }, []);

  return {
    peerId,
    isReady,
    activeConnectionsCount: activeConnections.length,
    lastReceivedPacket,
    lastAckPacket,
    connectionMode,
    sendSOSPacket,
    sendAcknowledgment
  };
}
