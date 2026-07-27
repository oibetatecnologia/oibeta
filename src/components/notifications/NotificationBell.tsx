import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';
import { useNotificationCenterContext } from '../../contexts/notifications/NotificationCenterContext';
import type { PlatformNotification } from '../../core/notifications/NotificationCenterTypes';

interface NotificationBellProps {
  onNavigate?: (tabId: string) => void;
}

export default function NotificationBell({
  onNavigate,
}: NotificationBellProps) {
  const center = useNotificationCenterContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleOpenNotification = async (
    notification: PlatformNotification,
  ) => {
    if (
      center.preference?.markReadOnOpen !== false &&
      String(notification.status).toUpperCase() !== 'READ'
    ) {
      await center.markRead(notification.id);
    }

    const targetTab = notification.metadataJson?.targetTab;
    if (typeof targetTab === 'string' && targetTab.trim()) {
      onNavigate?.(targetTab);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Abrir central de notificações"
        aria-expanded={open}
        className="relative rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-2 text-[var(--text-main)] transition hover:border-amber-500/40 hover:text-amber-300"
      >
        <Bell className="h-4 w-4" />
        {center.preference?.inAppEnabled !== false &&
          center.summary.unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border-2 border-[var(--bg-main)] bg-red-500 px-1 text-center text-[9px] font-black leading-4 text-white">
            {center.summary.unread > 99
              ? '99+'
              : center.summary.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-[90] max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[430px]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] p-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Central de notificações
              </span>
              <h2 className="mt-1 flex items-center gap-2 text-sm font-black text-[var(--text-main)]">
                <Bell className="h-4 w-4 text-amber-300" />
                {center.summary.unread} não lida(s)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[var(--border-color)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              aria-label="Fechar notificações"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-[var(--border-color)] p-3">
            <SummaryCell
              label="Não lidas"
              value={center.summary.unread}
            />
            <SummaryCell
              label="Críticas"
              value={center.summary.critical}
            />
            <SummaryCell
              label="Incidentes"
              value={center.summary.incidentAlerts}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2">
            <button
              type="button"
              onClick={() => void center.refresh()}
              disabled={center.isLoading}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-black text-[var(--text-secondary)] hover:bg-[var(--bg-main)] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  center.isLoading ? 'animate-spin' : ''
                }`}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => void center.markAllRead()}
              disabled={
                center.isSaving || center.summary.unread === 0
              }
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-black text-emerald-200 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </button>
          </div>

          <div className="max-h-[480px] overflow-y-auto p-3">
            {center.error ? (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                {center.error}
              </p>
            ) : center.notifications.length === 0 ? (
              <p className="p-4 text-center text-xs text-[var(--text-secondary)]">
                Nenhuma notificação para o usuário atual.
              </p>
            ) : (
              <div className="space-y-2">
                {center.notifications.slice(0, 20).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSaving={center.isSaving}
                    onRead={() =>
                      void center.markRead(notification.id)
                    }
                    onOpen={() =>
                      void handleOpenNotification(notification)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  isSaving,
  onRead,
  onOpen,
}: {
  notification: PlatformNotification;
  isSaving: boolean;
  onRead: () => void;
  onOpen: () => void;
}) {
  const unread =
    String(notification.status).toUpperCase() !== 'READ';
  const critical =
    notification.metadataJson?.escalationLevel === 'critical';
  const targetTab = notification.metadataJson?.targetTab;

  return (
    <article
      className={`rounded-xl border p-3 ${
        unread
          ? 'border-amber-500/25 bg-amber-500/5'
          : 'border-[var(--border-color)] bg-[var(--bg-main)]/25'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-lg p-1.5 ${
            critical
              ? 'bg-red-500/10 text-red-300'
              : unread
                ? 'bg-amber-500/10 text-amber-300'
                : 'bg-slate-500/10 text-slate-400'
          }`}
        >
          {critical ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="truncate text-xs font-black text-[var(--text-main)]">
            {notification.title}
          </h3>
          {notification.message && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
              {notification.message}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-mono text-[var(--text-secondary)]">
            <span>
              {new Date(notification.createdAt).toLocaleString(
                'pt-BR',
              )}
            </span>
            {typeof targetTab === 'string' && targetTab && (
              <span className="flex items-center gap-1 text-[var(--blue-accent)]">
                <ExternalLink className="h-3 w-3" />
                Abrir área
              </span>
            )}
          </div>
        </button>

        {unread && (
          <button
            type="button"
            onClick={onRead}
            disabled={isSaving}
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-1.5 text-emerald-200 disabled:opacity-50"
            aria-label="Marcar notificação como lida"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

function SummaryCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-2 text-center">
      <span className="block text-[8px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
      <strong className="mt-0.5 block text-sm font-black text-[var(--text-main)]">
        {value}
      </strong>
    </div>
  );
}
