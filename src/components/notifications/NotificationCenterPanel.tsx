import React from 'react';
import { AlertTriangle, Bell, CheckCheck, RefreshCw, Settings2 } from 'lucide-react';
import { useNotificationCenterContext } from '../../contexts/notifications/NotificationCenterContext';

export default function NotificationCenterPanel() {
  const center = useNotificationCenterContext();

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Central de notificações
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-300" />
            Alertas do usuário atual
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Notificações persistentes, isoladas por organização e usuário.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void center.refresh()}
            disabled={center.isLoading}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[11px] font-black text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${center.isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void center.markAllRead()}
            disabled={center.isSaving || center.summary.unread === 0}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-200 flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Total" value={center.summary.total} />
        <Metric label="Não lidas" value={center.summary.unread} />
        <Metric label="Críticas" value={center.summary.critical} />
        <Metric label="Incidentes" value={center.summary.incidentAlerts} />
        <Metric label="Prontidão" value={`${center.summary.readinessScore}%`} />
      </div>







      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Manutenção automática
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Executa diariamente a retenção somente quando existem registros encerrados elegíveis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void center.refreshMaintenanceScheduler()}
              disabled={center.isMaintenanceSchedulerLoading}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
            >
              Atualizar scheduler
            </button>
            <button
              type="button"
              onClick={() =>
                void center
                  .runMaintenanceSchedulerNow()
                  .then(() => center.refreshMaintenance())
              }
              disabled={center.isMaintenanceSchedulerRunningNow}
              className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[10px] font-black text-violet-200 disabled:opacity-50"
            >
              Executar ciclo agora
            </button>
          </div>
        </div>

        {center.maintenanceSchedulerError ||
        center.maintenanceScheduler.lastError ? (
          <p className="text-xs text-red-300">
            {center.maintenanceSchedulerError ||
              center.maintenanceScheduler.lastError}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <Metric
              label="Ativo"
              value={center.maintenanceScheduler.enabled ? 'Sim' : 'Não'}
            />
            <Metric
              label="Executando"
              value={center.maintenanceScheduler.running ? 'Sim' : 'Não'}
            />
            <Metric
              label="Intervalo"
              value={`${Math.round(
                center.maintenanceScheduler.intervalMs / 3_600_000,
              )}h`}
            />
            <Metric
              label="Candidatos"
              value={center.maintenanceScheduler.lastCandidates}
            />
            <Metric
              label="Removidos"
              value={center.maintenanceScheduler.lastRemoved}
            />
            <Metric
              label="Duração"
              value={`${center.maintenanceScheduler.lastDurationMs} ms`}
            />
            <Metric
              label="Última execução"
              value={
                center.maintenanceScheduler.lastRunAt
                  ? new Date(
                      center.maintenanceScheduler.lastRunAt,
                    ).toLocaleString('pt-BR')
                  : '—'
              }
            />
            <Metric
              label="Próxima execução"
              value={
                center.maintenanceScheduler.nextRunAt
                  ? new Date(
                      center.maintenanceScheduler.nextRunAt,
                    ).toLocaleString('pt-BR')
                  : '—'
              }
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Manutenção e retenção
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Remove registros antigos já encerrados e preserva as filas operacionais ativas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void center.refreshMaintenance()}
              disabled={center.isMaintenanceLoading}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
            >
              Atualizar análise
            </button>
            <button
              type="button"
              onClick={() => void center.executeMaintenance()}
              disabled={
                center.isMaintenanceExecuting ||
                center.maintenanceSummary.pendingCleanup === 0
              }
              className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[10px] font-black text-violet-200 disabled:opacity-50"
            >
              Executar limpeza
            </button>
          </div>
        </div>

        {center.maintenanceError ? (
          <p className="text-xs text-red-300">{center.maintenanceError}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <Metric label="Candidatos" value={center.maintenanceSummary.pendingCleanup} />
              <Metric label="Notificações lidas" value={center.maintenancePreview?.readNotifications || 0} />
              <Metric label="Entregas lidas" value={center.maintenancePreview?.readDeliveries || 0} />
              <Metric label="Dead-letter antigo" value={center.maintenancePreview?.deadLetterDeliveries || 0} />
              <Metric label="Execuções antigas" value={center.maintenancePreview?.retryRuns || 0} />
              <Metric label="Limpezas" value={center.maintenanceSummary.totalRuns} />
              <Metric label="Removidos" value={center.maintenanceSummary.totalRemoved} />
            </div>

            {center.maintenancePreview && (
              <p className="text-[10px] text-[var(--text-secondary)]">
                Política: notificações e entregas lidas por {center.maintenancePreview.policy.readNotificationsDays} dias,
                dead-letter por {center.maintenancePreview.policy.deadLetterDays} dias e histórico do scheduler por {center.maintenancePreview.policy.retryRunsDays} dias.
              </p>
            )}

            <div className="space-y-2">
              {center.maintenanceRuns.slice(0, 6).map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-violet-300">
                      {run.totalRemoved} registro(s) removido(s)
                    </span>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {run.readNotificationsRemoved} notificações · {run.readDeliveriesRemoved} entregas · {run.deadLetterDeliveriesRemoved} dead-letter · {run.retryRunsRemoved} execuções
                    </p>
                  </div>
                  <div className="text-[9px] text-[var(--text-secondary)] sm:text-right">
                    <div>{run.durationMs} ms</div>
                    <div>{new Date(run.finishedAt).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Histórico do scheduler
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Auditoria persistente das execuções automáticas e manuais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void center.refreshRetryRuns()}
            disabled={center.isRetryRunsLoading}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
          >
            Atualizar histórico
          </button>
        </div>

        {center.retryRunsError ? (
          <p className="text-xs text-red-300">{center.retryRunsError}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              <Metric label="Execuções" value={center.retryRunSummary.totalRuns} />
              <Metric label="Sucesso" value={center.retryRunSummary.successfulRuns} />
              <Metric label="Falhas" value={center.retryRunSummary.failedRuns} />
              <Metric label="Ignoradas" value={center.retryRunSummary.skippedRuns} />
              <Metric label="Processadas" value={center.retryRunSummary.totalProcessed} />
              <Metric label="Recuperadas" value={center.retryRunSummary.totalRetried} />
              <Metric label="Dead-letter" value={center.retryRunSummary.totalDeadLettered} />
              <Metric label="Taxa de sucesso" value={`${center.retryRunSummary.successRate}%`} />
            </div>

            <div className="space-y-2">
              {center.retryRuns.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div>
                    <span className={`text-[10px] font-black uppercase ${
                      run.status === 'success'
                        ? 'text-emerald-300'
                        : run.status === 'failed'
                          ? 'text-red-300'
                          : 'text-amber-300'
                    }`}>
                      {run.status} · {run.trigger}
                    </span>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {run.processed} processadas · {run.retried} recuperadas · {run.deadLettered} dead-letter
                    </p>
                    {run.errorMessage && (
                      <p className="text-[10px] text-red-300 mt-1">{run.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-[9px] text-[var(--text-secondary)] lg:text-right">
                    <div>{run.durationMs} ms</div>
                    <div>{new Date(run.startedAt).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Reprocessamento automático
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Executa retries com backoff progressivo e move falhas definitivas para dead-letter.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void center.refreshRetryScheduler()}
              disabled={center.isRetrySchedulerLoading}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
            >
              Atualizar scheduler
            </button>
            <button
              type="button"
              onClick={() =>
                void center
                  .runRetrySchedulerNow()
                  .then(() => center.refreshDeliveries())
              }
              disabled={center.isRetrySchedulerRunningNow}
              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[10px] font-black text-sky-200 disabled:opacity-50"
            >
              Executar agora
            </button>
          </div>
        </div>

        {center.retrySchedulerError || center.retryScheduler.lastError ? (
          <p className="text-xs text-red-300">
            {center.retrySchedulerError || center.retryScheduler.lastError}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric
              label="Em execução"
              value={center.retryScheduler.running ? 'Sim' : 'Não'}
            />
            <Metric
              label="Intervalo"
              value={`${Math.round(center.retryScheduler.intervalMs / 1000)}s`}
            />
            <Metric
              label="Processadas"
              value={center.retryScheduler.lastProcessed}
            />
            <Metric
              label="Recuperadas"
              value={center.retryScheduler.lastRetried}
            />
            <Metric
              label="Dead-letter"
              value={center.retryScheduler.lastDeadLettered}
            />
            <Metric
              label="Próxima execução"
              value={
                center.retryScheduler.nextRunAt
                  ? new Date(
                      center.retryScheduler.nextRunAt,
                    ).toLocaleTimeString('pt-BR')
                  : '—'
              }
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)]">
              Rastreabilidade de entrega
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Confirma criação, entrega no aplicativo, leitura e falhas operacionais.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void center.refreshDeliveries()}
              disabled={center.isDeliveryLoading}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
            >
              Atualizar entregas
            </button>
            <button
              type="button"
              onClick={() => void center.retryAllFailedDeliveries()}
              disabled={
                center.isDeliveryRetrying ||
                center.deliverySummary.retryableFailed === 0
              }
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-200 disabled:opacity-50"
            >
              Reprocessar falhas
            </button>
          </div>
        </div>

        {center.deliveryError ? (
          <p className="text-xs text-red-300">
            {center.deliveryError}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Metric label="Registros" value={center.deliverySummary.total} />
              <Metric label="Entregues" value={center.deliverySummary.delivered} />
              <Metric label="Lidas" value={center.deliverySummary.read} />
              <Metric label="Falhas" value={center.deliverySummary.failed} />
              <Metric label="Reprocessáveis" value={center.deliverySummary.retryableFailed} />
              <Metric label="Dead-letter" value={center.deliverySummary.deadLetter} />
              <Metric label="Taxa de entrega" value={`${center.deliverySummary.deliveryRate}%`} />
              <Metric label="Taxa de leitura" value={`${center.deliverySummary.readRate}%`} />
            </div>

            {center.deliveryRecords.length > 0 && (
              <div className="space-y-2">
                {center.deliveryRecords.slice(0, 8).map((record) => (
                  <div
                    key={record.id}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-[var(--text-main)]">
                        {record.channel}
                      </span>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                        Notificação {record.notificationId} · tentativa {record.attemptCount}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className={`text-[10px] font-black uppercase ${
                        record.status === 'failed' ||
                        record.status === 'dead_letter'
                          ? 'text-red-300'
                          : record.status === 'read'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                      }`}>
                        {record.status}
                      </span>
                      <p className="text-[9px] text-[var(--text-secondary)] mt-1">
                        {new Date(record.updatedAt).toLocaleString('pt-BR')}
                      </p>
                      {record.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => void center.retryDelivery(record.id)}
                          disabled={center.isDeliveryRetrying}
                          className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] font-black text-amber-200 disabled:opacity-50"
                        >
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-sky-300" />
              Preferências do usuário
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Controle quais alertas operacionais serão entregues nesta central.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void center.refreshPreference()}
            disabled={center.isPreferenceLoading}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] disabled:opacity-50"
          >
            Atualizar preferências
          </button>
        </div>

        {center.preferenceError ? (
          <p className="text-xs text-red-300">
            {center.preferenceError}
          </p>
        ) : center.isPreferenceLoading || !center.preference ? (
          <p className="text-xs text-[var(--text-secondary)]">
            Carregando preferências...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <PreferenceToggle
              label="Central no aplicativo"
              helper="Mantém a entrega visual ativa."
              checked={center.preference.inAppEnabled}
              disabled={center.isPreferenceSaving}
              onChange={(checked) =>
                void center.updatePreference({
                  inAppEnabled: checked,
                })
              }
            />

            <PreferenceToggle
              label="Alertas de incidentes"
              helper="Recebe escalonamentos operacionais."
              checked={center.preference.incidentAlertsEnabled}
              disabled={center.isPreferenceSaving}
              onChange={(checked) =>
                void center.updatePreference({
                  incidentAlertsEnabled: checked,
                })
              }
            />

            <PreferenceToggle
              label="Marcar ao abrir"
              helper="Confirma leitura ao navegar pela notificação."
              checked={center.preference.markReadOnOpen}
              disabled={center.isPreferenceSaving}
              onChange={(checked) =>
                void center.updatePreference({
                  markReadOnOpen: checked,
                })
              }
            />

            <label className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 space-y-2">
              <span className="text-xs font-black text-[var(--text-main)] block">
                Prioridade mínima
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Filtra alertas de incidentes por nível.
              </span>
              <select
                value={center.preference.minimumEscalationLevel}
                disabled={center.isPreferenceSaving}
                onChange={(event) =>
                  void center.updatePreference({
                    minimumEscalationLevel:
                      event.target.value as
                        | 'standard'
                        | 'high'
                        | 'critical',
                  })
                }
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] disabled:opacity-50"
              >
                <option value="standard">Padrão, alta e crítica</option>
                <option value="high">Alta e crítica</option>
                <option value="critical">Somente crítica</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {center.error ? (
        <p className="text-xs text-red-300">{center.error}</p>
      ) : center.notifications.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">Nenhuma notificação para o usuário atual.</p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {center.notifications.map((notification) => {
            const unread = String(notification.status).toUpperCase() !== 'READ';
            const critical = notification.metadataJson?.escalationLevel === 'critical';
            return (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${unread ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border-color)] bg-[var(--bg-main)]/30'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                      {critical && <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />}
                      <span className="truncate">{notification.title}</span>
                    </h3>
                    {notification.message && (
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-mono">
                      {notification.notificationType || 'NOTIFICATION'} · {new Date(notification.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {unread && (
                    <button
                      type="button"
                      onClick={() => void center.markRead(notification.id)}
                      disabled={center.isSaving}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-black text-emerald-200 disabled:opacity-50"
                    >
                      Lida
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


function PreferenceToggle({
  label,
  helper,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  helper: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="text-xs font-black text-[var(--text-main)] block">
          {label}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
          {helper}
        </span>
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
      <span className="text-[9px] uppercase font-mono font-black text-[var(--text-secondary)] block">{label}</span>
      <strong className="text-lg font-black text-[var(--text-main)] block mt-1">{value}</strong>
    </div>
  );
}
