import React, { useState, useEffect } from 'react';
import { 
  Download, X, Smartphone, ShieldCheck, Share, PlusSquare, 
  WifiOff, CheckCircle2, ChevronRight, Sparkles 
} from 'lucide-react';
import { deviceServices } from '../../services/deviceServices';

export const PWAInstallBanner: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  });
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const standalone = deviceServices.isStandalone();
    setIsStandalone(standalone);

    // Detect iOS
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isApple);

    // Subscribe to install prompt availability
    const unsub = deviceServices.subscribeInstallPrompt((available) => {
      setCanInstall(available);
    });

    return () => unsub();
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (canInstall) {
      const outcome = await deviceServices.promptInstall();
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
    } else {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-slide-up">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 rounded-2xl p-4 text-slate-100 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center p-2 shadow-lg shadow-cyan-600/30 flex-shrink-0">
                <img src="/icon.svg" alt="ResQGrid Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-100 tracking-tight">Install ResQGrid AI</h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">PWA</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1">Install to home screen for 100% Zero-Network offline operations</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Close install banner"
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/80 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Zero-Wi-Fi SOS Mesh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Native GPS & Vibration</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Install App on Device</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari / Manual Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-white">Install on Your Device</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Install ResQGrid on your iPhone, iPad, or Android for full native device sensors, GPS caching, and offline radio triage.
            </p>

            <div className="space-y-3 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs text-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Tap the Share icon</span>
                  <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                    Found at the bottom of Safari (<Share className="w-3 h-3 text-cyan-400 inline" />) or browser menu (<span className="font-bold">⋮</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Select "Add to Home Screen"</span>
                  <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                    Scroll down and tap <PlusSquare className="w-3 h-3 text-cyan-400 inline" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Launch anytime offline</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    ResQGrid will launch in full standalone mode with offline caches pre-loaded.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Got It, Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
};
