import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { deviceServices } from '../../services/deviceServices';

interface PWAInstallButtonProps {
  variant?: 'button' | 'badge' | 'sidebar';
  onOpenDeviceHub?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button', onOpenDeviceHub }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(deviceServices.isStandalone());

    const unsub = deviceServices.subscribeInstallPrompt((available) => {
      setCanInstall(available);
      setIsInstalled(deviceServices.isStandalone());
    });

    return () => unsub();
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      if (onOpenDeviceHub) onOpenDeviceHub();
      return;
    }

    if (canInstall) {
      const outcome = await deviceServices.promptInstall();
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } else if (onOpenDeviceHub) {
      onOpenDeviceHub();
    } else {
      alert(
        'To install ResQGrid on your device:\n\n• On Chrome/Edge: Click the install icon in the address bar (or menu ⋮ > "Install ResQGrid")\n• On iPhone/iPad Safari: Tap Share button and select "Add to Home Screen".'
      );
    }
  };

  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={onOpenDeviceHub}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/40 transition"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>PWA Installed</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      );
    }
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition active:scale-95"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Install Web App</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px]">Offline</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      title="Install ResQGrid as a native app on your phone or computer for 100% offline access"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition active:scale-95"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
};
