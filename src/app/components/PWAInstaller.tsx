'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, DownloadIcon } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;

    if (isIos && !isStandalone && !window.localStorage.getItem('dismissedIosInstallTip')) {
      setShowIosInstallTip(true);
    }

    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch((error) => {
          console.log('Falha ao registrar Service Worker:', error);
        });
    }

    // Detectar evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar se já foi instalado
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA instalado pelo usuário');
      } else {
        console.log('PWA não instalado pelo usuário');
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  if (!showInstallButton) {
    if (!showIosInstallTip) {
      return null;
    }

    return (
      <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Instalar app</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              No iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem('dismissedIosInstallTip', 'true');
              setShowIosInstallTip(false);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-bold text-white active:scale-95"
          >
            <CheckIcon className="h-4 w-4" />
            Ok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50">
      <button
        onClick={handleInstallClick}
        className="flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-slate-800 active:scale-95"
      >
        <DownloadIcon className="h-5 w-5" />
        Instalar App
      </button>
    </div>
  );
}
