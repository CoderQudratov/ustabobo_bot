"use client";

import { useState } from "react";
import { webappLoginApi, setWebappAuth } from "@/utils/api";

type Props = {
  onSuccess: () => void;
};

export function LoginScreen({ onSuccess }: Props) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const l = login.trim();
    const p = password;
    if (!l || !p) {
      setError("Login va parolni kiriting.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await webappLoginApi(l, p);
      setWebappAuth(token, user);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login yoki parol xato.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[var(--bg)]">
      <div className="card-webapp w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-tight text-[var(--text)]">
            🔧 AVTO PRO
          </div>
          <div className="mt-1 text-sm text-[var(--text-2)]">Usta paneli</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="login"
              className="mb-1 block text-sm font-medium text-[var(--text-2)]"
            >
              Login
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              className="input-webapp"
              placeholder="Loginni kiriting"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[var(--text-2)]"
            >
              Parol
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input-webapp"
              placeholder="Parolni kiriting"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2"
          >
            {loading ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
