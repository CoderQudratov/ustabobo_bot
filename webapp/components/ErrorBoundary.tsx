'use client';

import React from 'react';
import { getApiUrl, getTelegramUserId } from '@/utils/api';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const telegramId = getTelegramUserId();
    const url = getApiUrl('webapp/log-error');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message ?? String(error),
        stack: error?.stack ?? errorInfo?.componentStack ?? '',
        telegram_id: telegramId || undefined,
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
          <p className="text-lg font-medium mb-2">Xatolik yuz berdi</p>
          <p className="text-sm opacity-80 mb-4">
            Iltimos, ilovani qayta oching yoki bot orqali kirib ko‘ring.
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Qayta urinish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
