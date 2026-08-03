import React, { useState } from 'react';
import { DatabaseZap, Eye, EyeOff, History, KeyRound, Play, Save, ShieldAlert, Trash2, X } from 'lucide-react';
import type { RadarConnectorCredentialScope, RadarConnectorDescriptor, RadarSyncRun } from '../../core/commercial/connectors/RadarConnectorTypes';

interface RadarConnectorPanelProps {
  connectors: RadarConnectorDescriptor[];
  runs: RadarSyncRun[];
  runningConnectorId?: string;
  onRun: (connectorId: string) => Promise<void>;
  onSaveCredential: (connectorId: string, input: { scope: RadarConnectorCredentialScope; secret: string; label?: string }) => Promise<void>;
  onRevokeCredential: (connectorId: string, scope: RadarConnectorCredentialScope) => Promise<void>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-[var(--border-color)] px-1 py-1"><div className="text-[10px] font-black text-[var(--text-main)]">{value}</div><div className="text-[8px] uppercase text-[var(--text-secondary)]">{label}</div></div>;
}

const statusLabel: Record<RadarSyncRun['status'], string> = {
  idle: 'Aguardando', running: 'Executando', completed: 'Concluída', completed_with_warnings: 'Concluída com alertas', failed: 'Falhou',
};

const authPolicyLabel: Record<RadarConnectorDescriptor['authPolicy'], string> = {
  PUBLIC_NO_AUTH: 'Integração nativa sem chave',
  GLOBAL_PLATFORM: 'Credencial global da Oi Beta',
  TENANT_PROVIDED: 'Credencial própria do cliente',
  GLOBAL_OR_TENANT: 'Credencial global ou do cliente',
};

export default function RadarConnectorPanel({ connectors, runs, runningConnectorId, onRun, onSaveCredential, onRevokeCredential }: RadarConnectorPanelProps) {
  const [editingConnectorId, setEditingConnectorId] = useState<string>();
  const [scope, setScope] = useState<RadarConnectorCredentialScope>('tenant');
  const [secret, setSecret] = useState('');
  const [label, setLabel] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const latestByConnector = new Map<string, RadarSyncRun>();
  for (const run of runs) if (!latestByConnector.has(run.connectorId)) latestByConnector.set(run.connectorId, run);

  const closeEditor = () => {
    setEditingConnectorId(undefined); setSecret(''); setLabel(''); setFormError(undefined); setShowSecret(false);
  };

  const saveCredential = async (connector: RadarConnectorDescriptor) => {
    if (!secret.trim()) { setFormError('Informe a chave, token ou credencial fornecida pelo conector.'); return; }
    setSaving(true); setFormError(undefined);
    try { await onSaveCredential(connector.id, { scope, secret, label: label.trim() || undefined }); closeEditor(); }
    catch (error: any) { setFormError(error?.message || 'Não foi possível salvar a credencial.'); }
    finally { setSaving(false); }
  };

  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-3">
        <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><DatabaseZap className="w-4 h-4 text-[var(--blue-accent)]" />Conectores e sincronização</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Fontes nativas funcionam automaticamente. Credenciais privadas são armazenadas criptografadas no backend e nunca voltam ao navegador.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {connectors.map((connector) => {
          const latest = latestByConnector.get(connector.id);
          const isRunning = runningConnectorId === connector.id || latest?.status === 'running';
          const isEditing = editingConnectorId === connector.id;
          const needsCredential = connector.authPolicy !== 'PUBLIC_NO_AUTH';
          const canRun = connector.available && (!needsCredential || connector.credentialConfigured);
          return (
            <div key={connector.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-xs font-black text-[var(--text-main)]">{connector.label}</h3><p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">{connector.description}</p></div>
                <span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${connector.available ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>{connector.available ? 'Disponível' : 'Planejado'}</span>
              </div>

              <div className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-[10px]">
                <div className="flex items-center justify-between gap-2"><span className="text-[var(--text-secondary)]">Autenticação</span><strong className="text-[var(--text-main)]">{authPolicyLabel[connector.authPolicy]}</strong></div>
                {connector.authPolicy === 'PUBLIC_NO_AUTH' ? (
                  <p className="mt-1 text-emerald-300">Pronta automaticamente para todos os tenants licenciados.</p>
                ) : connector.credentialConfigured ? (
                  <p className="mt-1 text-emerald-300">Configurada ({connector.credentialScope === 'global' ? 'Oi Beta' : 'tenant'}) · {connector.credentialMaskedValue}</p>
                ) : (
                  <p className="mt-1 text-amber-300">Aguardando credencial autorizada do provedor.</p>
                )}
              </div>

              {connector.canConfigureCredential && needsCredential && (
                <div className="space-y-2">
                  {!isEditing ? (
                    <button type="button" onClick={() => { setEditingConnectorId(connector.id); setScope(connector.credentialScope || 'tenant'); setFormError(undefined); }} className="w-full px-3 py-2 rounded-lg border border-[var(--blue-accent)]/30 text-[10px] font-black uppercase tracking-widest font-mono flex items-center justify-center gap-2"><KeyRound className="w-3.5 h-3.5" />{connector.credentialConfigured ? 'Substituir credencial' : 'Configurar credencial'}</button>
                  ) : (
                    <div className="rounded-xl border border-[var(--blue-accent)]/30 bg-[var(--blue-accent)]/5 p-3 space-y-2">
                      <div className="flex items-center justify-between"><strong className="text-[10px] text-[var(--text-main)]">Credencial segura</strong><button type="button" onClick={closeEditor}><X className="w-4 h-4" /></button></div>
                      <select value={scope} onChange={(event) => setScope(event.target.value as RadarConnectorCredentialScope)} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"><option value="tenant">Credencial deste tenant</option><option value="global">Credencial global da Oi Beta</option></select>
                      <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Identificação opcional (ex.: Conta principal)" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />
                      <div className="relative"><input type={showSecret ? 'text' : 'password'} value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="new-password" placeholder="Chave, token ou segredo" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 pr-10 text-xs text-[var(--text-main)]" /><button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2">{showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                      {formError && <p className="text-[10px] text-red-300">{formError}</p>}
                      <button type="button" disabled={saving} onClick={() => saveCredential(connector)} className="w-full px-3 py-2 rounded-lg bg-[var(--blue-accent)] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-3.5 h-3.5" />{saving ? 'Salvando' : 'Salvar criptografada'}</button>
                    </div>
                  )}
                  {connector.credentialConfigured && (
                    <button type="button" onClick={() => onRevokeCredential(connector.id, connector.credentialScope || 'tenant')} className="w-full px-3 py-2 rounded-lg border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Trash2 className="w-3.5 h-3.5" />Revogar credencial</button>
                  )}
                </div>
              )}

              {latest && <div className="space-y-2"><div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-2"><History className="w-3.5 h-3.5" />Última execução: {statusLabel[latest.status]} em {new Date(latest.startedAt).toLocaleString('pt-BR')}</div><div className="grid grid-cols-4 gap-1 text-center"><Metric label="Recebidos" value={latest.metrics.received} /><Metric label="Criados" value={latest.metrics.created} /><Metric label="Atualizados" value={latest.metrics.updated} /><Metric label="Ignorados" value={latest.metrics.ignored} /></div>{latest.warnings.length > 0 && <p className="text-[9px] text-amber-300/90">{latest.warnings[0]}</p>}{latest.errors.length > 0 && <p className="text-[9px] text-red-300/90">{latest.errors[0]}</p>}</div>}
              {!connector.available && connector.unavailableReason && <div className="flex items-start gap-2 text-[10px] text-amber-300/90"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{connector.unavailableReason}</span></div>}
              <button type="button" disabled={!canRun || isRunning} onClick={() => onRun(connector.id)} className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest font-mono flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><Play className="w-3.5 h-3.5" />{isRunning ? 'Sincronizando' : 'Sincronizar agora'}</button>
            </div>
          );
        })}
      </div>

      <div id="radar-sync-history" className="rounded-xl border border-[var(--blue-accent)]/25 bg-[var(--blue-accent)]/5 p-4 space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><History className="w-4 h-4 text-[var(--blue-accent)]" />Histórico de sincronizações do Radar</h3><p className="text-[10px] text-[var(--text-secondary)] mt-1">Cada linha representa uma execução do conector.</p></div><span className="text-[10px] font-mono text-[var(--text-secondary)]">{runs.length} execução(ões)</span></div>
        {runs.length === 0 ? <p className="text-[10px] text-[var(--text-secondary)]">Nenhuma sincronização executada ainda.</p> : <div className="space-y-2">{runs.slice(0, 5).map((run) => <div key={run.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2"><div><span className="text-[10px] font-black text-[var(--text-main)]">{connectors.find((item) => item.id === run.connectorId)?.label || run.connectorId}</span><span className="text-[9px] text-[var(--text-secondary)] block">{statusLabel[run.status]} · {new Date(run.startedAt).toLocaleString('pt-BR')}</span></div><span className="text-[9px] font-mono text-[var(--text-secondary)]">{run.metrics.received} recebidos · {run.metrics.created} criados · {run.metrics.updated} atualizados</span></div>)}</div>}
      </div>
    </section>
  );
}
