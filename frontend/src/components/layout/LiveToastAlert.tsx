import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, ArrowRight, X, Heart, MapPin } from 'lucide-react';
import { OfflineSOSPacket, offlineMeshNetwork } from '../../services/offlineMeshNetwork';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const LiveToastAlert: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useEmergencyStore();
  const [activeToast, setActiveToast] = useState<{
    id: string;
    type: 'SOS_INCOMING' | 'DISPATCH_CONFIRMED';
    title: string;
    description: string;
    packet: OfflineSOSPacket;
  } | null>(null);

  useEffect(() => {
    // 1. Listen for new incoming SOS broadcasts
    const unsubSOS = offlineMeshNetwork.subscribeToIncomingSOS((packet) => {
      // Only show incoming SOS toast to Doctors & Admins
      if (currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator' || currentUser.role === 'admin') {
        setActiveToast({
          id: packet.packetId,
          type: 'SOS_INCOMING',
          title: `🚨 CRITICAL SOS: ${packet.senderName}`,
          description: packet.triageReason,
          packet
        });
      }
    });

    // 2. Listen for dispatch acknowledgments
    const unsubAck = offlineMeshNetwork.subscribeToAcknowledgment((ackPacket) => {
      // Show dispatch confirmation toast
      setActiveToast({
        id: ackPacket.packetId,
        type: 'DISPATCH_CONFIRMED',
        title: `🚑 Help Is En Route!`,
        description: `Dispatch confirmed by ${ackPacket.acknowledgedBy?.responderName || 'Emergency Response Team'} (${ackPacket.acknowledgedBy?.unitCallsign || 'Ambulance'})`,
        packet: ackPacket
      });
    });

    return () => {
      unsubSOS();
      unsubAck();
    };
  }, [currentUser.role]);

  // Auto-dismiss toast after 12 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  if (!activeToast) return null;

  const isIncoming = activeToast.type === 'SOS_INCOMING';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
        isIncoming
          ? 'bg-slate-900/95 border-rose-500/60 shadow-rose-500/20 text-white'
          : 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-500/20 text-white'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isIncoming ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              {isIncoming ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{activeToast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{activeToast.description}</p>
            </div>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(activeToast.packet.timestamp).toLocaleTimeString()}
          </span>

          <button
            onClick={() => {
              setActiveToast(null);
              navigate('/radio-sos');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              isIncoming
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            <span>{isIncoming ? 'View Triage Queue' : 'View Status'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
