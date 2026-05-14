"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import { LogInIcon, LogOutIcon } from "./Icons";

const STORAGE_KEY = "chamadaUtfprAuth";

interface LocalAuthGateProps {
  children: ReactNode;
}

interface LocalAuthContextValue {
  encryptedCredentials: string | null;
  username: string | null;
}

const LocalAuthContext = createContext<LocalAuthContextValue>({
  encryptedCredentials: null,
  username: null,
});

export function useLocalAuth() {
  return useContext(LocalAuthContext);
}

export default function LocalAuthGate({ children }: LocalAuthGateProps) {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [authenticatedUsername, setAuthenticatedUsername] = useState<string | null>(null);
  const [encryptedCredentials, setEncryptedCredentials] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const encrypted = window.localStorage.getItem(STORAGE_KEY);

    if (!encrypted) {
      setIsCheckingAuth(false);
      return;
    }

    setEncryptedCredentials(encrypted);

    async function restoreAuth() {
      try {
        const response = await fetch("/api/local-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "decrypt", encrypted }),
        });

        if (!response.ok) {
          throw new Error("Invalid saved credentials");
        }

        const data = await response.json();
        setAuthenticatedUsername(data.username);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setEncryptedCredentials(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    void restoreAuth();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/local-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "encrypt",
          username,
          senha,
        }),
      });

      if (!response.ok) {
        throw new Error("Auth failed");
      }

      const data = await response.json();
      window.localStorage.setItem(STORAGE_KEY, data.encrypted);
      setEncryptedCredentials(data.encrypted);
      setAuthenticatedUsername(data.username);
      setSenha("");
    } catch {
      setError("Não foi possível entrar. Confira a configuração da chave local.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthenticatedUsername(null);
    setEncryptedCredentials(null);
    setUsername("");
    setSenha("");
    setError("");
  };

  if (isCheckingAuth) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">
          Verificando autenticação...
        </div>
      </div>
    );
  }

  if (authenticatedUsername) {
    return (
      <>
        <div className="w-full">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1 text-emerald-950 shadow-sm">
            <p className="min-w-0 text-sm font-semibold leading-5">
              Autenticado como: {authenticatedUsername}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-7 shrink-0 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
            >
              <LogOutIcon className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
        <LocalAuthContext.Provider
          value={{
            encryptedCredentials,
            username: authenticatedUsername,
          }}
        >
          {children}
        </LocalAuthContext.Provider>
      </>
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="animate-[resultIn_260ms_ease-out] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
          <p className="font-semibold">Seus dados ficam só no seu navegador.</p>
          <p className="mt-0.5">
            Este app <strong>não possui banco de dados</strong>. Suas credenciais são{" "}
            <strong>criptografadas e salvas localmente</strong> no seu dispositivo (localStorage) e
            usadas apenas para autenticar no site da chamada.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-800">
              Usuário do Moodle
            </label>
            <input
              type="text"
              id="username"
              className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              placeholder="a2818....."
              required
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-2 block text-sm font-semibold text-slate-800">
              Senha do Moodle
            </label>
            <input
              type="password"
              id="senha"
              className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              placeholder="Senha"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <LogInIcon className="h-5 w-5" />
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
