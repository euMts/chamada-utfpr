"use client"
import LocalAuthGate from './components/LocalAuthGate';
import QRReader from './components/QRReader';
import PWAInstaller from './components/PWAInstaller';

export default function Home() {
  return (
    <main className="min-h-dvh bg-gray-100 px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="px-1 pt-1 text-center">
          <h1 className="text-[1.7rem] font-bold leading-tight text-slate-950">
            Chamada UTFPR
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Aponte a câmera para o QR code da chamada
          </p>
        </div>
        
        <LocalAuthGate>
          <QRReader />
        </LocalAuthGate>

        <a
          href="https://github.com/eumts/chamada-utfpr"
          target="_blank"
          rel="noreferrer"
          className="self-center text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          github.com/eumts/chamada-utfpr
        </a>
      </div>
      
      <PWAInstaller />
    </main>
  );
}
