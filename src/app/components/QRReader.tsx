'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { ArrowLeftIcon, CameraIcon, CheckIcon, RotateCwIcon, SendIcon, StopIcon } from './Icons';
import { useLocalAuth } from './LocalAuthGate';

interface QRReaderProps {
  onResult?: (result: string) => void;
}

interface DetectedQRCode {
  id: string;
  siteUrl: string;
  originalUrl: string;
  callName: string | null;
  callNameDebug: CallNameDebugInfo | null;
  callNameError: string | null;
  isLoadingCallName: boolean;
}

interface CallNameDebugInfo {
  source: 'html-label' | 'error';
  requestedUrl: string;
  idChamada: string | null;
  searchedHtmlInfo: string[];
  matchedLabelHtml?: string | null;
  extractedText?: string | null;
  fetchedHtml?: string | null;
  fetchStatus?: number | null;
  fetchStatusText?: string | null;
  errorMessage?: string | null;
}

interface CallNameResponse {
  label?: string;
  debug?: CallNameDebugInfo;
  error?: string | null;
}

interface RegisterPresenceResponse {
  ok?: boolean;
  error?: string;
}

function parseQRCodeContent(content: string): DetectedQRCode | null {
  try {
    const url = new URL(content);
    const id = url.searchParams.get('idChamada');

    if (!id) {
      return null;
    }

    return {
      id,
      siteUrl: `${url.origin}${url.pathname}`,
      originalUrl: url.toString(),
      callName: null,
      callNameDebug: null,
      callNameError: null,
      isLoadingCallName: true,
    };
  } catch {
    return null;
  }
}

export default function QRReader({ onResult }: QRReaderProps) {
  const { encryptedCredentials } = useLocalAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const lastContentRef = useRef<string | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedQRCode, setDetectedQRCode] = useState<DetectedQRCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegisteringPresence, setIsRegisteringPresence] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);

  const loadCallName = async (qrCode: DetectedQRCode) => {
    try {
      const response = await fetch(`/api/chamada-label?url=${encodeURIComponent(qrCode.originalUrl)}`);
      const data = (await response.json()) as CallNameResponse;

      setDetectedQRCode((current) => {
        if (!current || current.originalUrl !== qrCode.originalUrl) {
          return current;
        }

        return {
          ...current,
          callName: data.label?.trim() || null,
          callNameDebug: data.debug ?? null,
          callNameError: data.label?.trim()
            ? null
            : data.error ?? data.debug?.errorMessage ?? 'Nenhuma tag <label> foi encontrada no HTML retornado.',
          isLoadingCallName: false,
        };
      });
    } catch {
      setDetectedQRCode((current) => {
        if (!current || current.originalUrl !== qrCode.originalUrl) {
          return current;
        }

        return {
          ...current,
          callName: null,
          callNameDebug: null,
          callNameError: 'Não foi possível carregar o HTML da chamada.',
          isLoadingCallName: false,
        };
      });
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      setError(null);
      setRegistrationError(null);
      setRegistrationSucceeded(false);
      setIsScanning(true);
      setDetectedQRCode(null);
      lastContentRef.current = null;

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const content = result.data;
          const qrCode = parseQRCodeContent(content);

          if (!qrCode) {
            setError('QR Code sem idChamada na URL.');
            return;
          }

          if (lastContentRef.current === content) {
            return;
          }

          lastContentRef.current = content;
          setError(null);
          setDetectedQRCode(qrCode);
          onResult?.(content);
          void loadCallName(qrCode);

          if (qrScannerRef.current) {
            qrScannerRef.current.stop();
          }

          setIsScanning(false);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
      
    } catch {
      setError('Erro ao iniciar a câmera. Verifique as permissões.');
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    
    setIsScanning(false);
    setDetectedQRCode(null);
    setRegistrationError(null);
    setRegistrationSucceeded(false);
    lastContentRef.current = null;
  };

  const scanAgain = () => {
    setDetectedQRCode(null);
    setError(null);
    setRegistrationError(null);
    setRegistrationSucceeded(false);
    lastContentRef.current = null;

    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current);
    }

    restartTimeoutRef.current = window.setTimeout(() => {
      restartTimeoutRef.current = null;
      void startScanning();
    }, 0);
  };

  const returnToScanner = () => {
    setRegistrationSucceeded(false);
    scanAgain();
  };

  const registerPresence = async () => {
    if (!detectedQRCode || !encryptedCredentials) {
      setRegistrationError('Credenciais não encontradas. Saia e entre novamente.');
      return;
    }

    setIsRegisteringPresence(true);
    setRegistrationError(null);

    const fallbackErrorMessage = 'Não foi possível registrar presença.';

    try {
      const response = await fetch('/api/register-presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalUrl: detectedQRCode.originalUrl,
          encryptedCredentials,
        }),
      });
      const data = (await response.json().catch(() => null)) as RegisterPresenceResponse | null;

      if (!response.ok) {
        throw new Error(data?.error ?? fallbackErrorMessage);
      }

      setRegistrationSucceeded(true);
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : fallbackErrorMessage);
    } finally {
      setIsRegisteringPresence(false);
    }
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const showCamera = !detectedQRCode;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {showCamera && (
          <div className="animate-[fadeIn_220ms_ease-out]">
            {/* Video Container */}
            <div className="relative h-[min(62dvh,34rem)] min-h-80 w-full overflow-hidden bg-slate-950">
              <video
                ref={videoRef}
                className={`absolute inset-0 h-full w-full bg-slate-950 object-cover transition-opacity duration-200 ${
                  isScanning ? 'opacity-100' : 'opacity-0'
                }`}
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 px-6">
                  <button
                    onClick={startScanning}
                    className="inline-flex min-h-12 w-full max-w-56 items-center justify-center gap-2 rounded-md bg-green-600 px-5 text-sm font-bold text-white shadow-lg transition duration-200 hover:bg-green-700 hover:scale-[1.03] active:scale-95"
                  >
                    <CameraIcon className="h-5 w-5" />
                    Iniciar Leitura
                  </button>
                </div>
              )}
              {isScanning && (
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 animate-[scanLine_1.4s_ease-in-out_infinite] bg-green-400 shadow-[0_0_16px_rgba(74,222,128,0.9)]" />
              )}
            </div>

            {/* Controls */}
            {isScanning && (
              <div className="bg-slate-50 p-3">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={stopScanning}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white transition duration-200 hover:bg-red-700 active:scale-95"
                  >
                    <StopIcon className="h-5 w-5" />
                    Parar Leitura
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border-l-4 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        )}

        {registrationSucceeded && detectedQRCode && (
          <div className="animate-[resultIn_260ms_ease-out] border-l-4 border-emerald-500 bg-emerald-50 p-4">
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckIcon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950">
                Presença registrada
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Sua presença foi enviada com sucesso.
              </p>
            </div>
            <button
              onClick={returnToScanner}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-emerald-800 active:scale-[0.98]"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Voltar
            </button>
          </div>
        )}

        {/* Content Display - Only shows when there's detected content */}
        {detectedQRCode && !registrationSucceeded && (
          <div className="animate-[resultIn_260ms_ease-out] border-l-4 border-green-500 bg-green-50 p-4">
            <h3 className="mb-4 text-xl font-bold leading-tight text-green-900">
              Chamada UTFPR
            </h3>
            <div className="space-y-3 rounded-lg border border-green-100 bg-white p-4">
              <div className="space-y-1">
                <p className="text-[0.7rem] font-bold uppercase text-slate-500">ID</p>
                <p className="break-all font-mono text-sm leading-5 text-slate-950">{detectedQRCode.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.7rem] font-bold uppercase text-slate-500">Site</p>
                <p className="break-all text-sm leading-5 text-slate-950">{detectedQRCode.siteUrl}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.7rem] font-bold uppercase text-slate-500">Chamada</p>
                <p className="break-words text-base font-bold leading-6 text-slate-950">
                  {detectedQRCode.isLoadingCallName
                    ? 'Carregando nome da chamada...'
                    : detectedQRCode.callName ?? 'Nome indisponível'}
                </p>
                {!detectedQRCode.isLoadingCallName && detectedQRCode.callNameError && (
                  <p className="text-xs font-semibold leading-5 text-red-700">
                    {detectedQRCode.callNameError}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-green-700">
              Última detecção: {new Date().toLocaleTimeString()}
            </p>
            {registrationError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                {registrationError}
              </p>
            )}
            <button
              onClick={registerPresence}
              disabled={isRegisteringPresence}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-green-700 hover:scale-[1.01] active:scale-[0.98]"
            >
              <SendIcon className="h-5 w-5" />
              {isRegisteringPresence ? 'Registrando...' : 'Registrar Presença'}
            </button>
            <button
              onClick={scanAgain}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition duration-200 hover:bg-slate-50 hover:scale-[1.01] active:scale-[0.98]"
            >
              <RotateCwIcon className="h-5 w-5" />
              Escanear novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
