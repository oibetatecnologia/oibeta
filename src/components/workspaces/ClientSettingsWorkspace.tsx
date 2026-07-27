import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Palette, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { OperationalContextResolver } from '../../core/tenants/OperationalContextResolver';
import { SafeJsonStorage } from '../../core/persistence/SafeJsonStorage';

interface ClientOrganizationSettings {
  legalName: string;
  displayName: string;
  document: string;
  primaryContactName: string;
  primaryContactEmail: string;
  accentLabel: string;
  aiProvider: 'none' | 'openai' | 'google' | 'anthropic' | 'local' | 'other';
  aiConnectionLabel: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: ClientOrganizationSettings = {
  legalName: '',
  displayName: '',
  document: '',
  primaryContactName: '',
  primaryContactEmail: '',
  accentLabel: 'Padrão Oi Beta',
  aiProvider: 'none',
  aiConnectionLabel: '',
};

export default function ClientSettingsWorkspace() {
  const { user } = useWorkspace().tenant;
  const context = OperationalContextResolver.resolve(user);
  const storageKey = useMemo(() => `beta.client-settings.${context.tenantId}`, [context.tenantId]);
  const canEdit = context.role === 'tenant_admin';
  const initial = useMemo(() => {
    const stored = SafeJsonStorage.read<ClientOrganizationSettings>({
      key: storageKey,
      fallback: DEFAULT_SETTINGS,
      label: 'configurações da organização',
    });

    return {
      ...stored,
      displayName: stored.displayName || String(user?.organizationName || user?.tenantName || ''),
      primaryContactName: stored.primaryContactName || String(user?.name || ''),
      primaryContactEmail: stored.primaryContactEmail || String(user?.email || ''),
    };
  }, [storageKey, user]);

  const [form, setForm] = useState<ClientOrganizationSettings>(initial);
  const [message, setMessage] = useState<string>();

  const update = <K extends keyof ClientOrganizationSettings>(key: K, value: ClientOrganizationSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    const normalized: ClientOrganizationSettings = {
      ...form,
      legalName: form.legalName.trim(),
      displayName: form.displayName.trim(),
      document: form.document.trim(),
      primaryContactName: form.primaryContactName.trim(),
      primaryContactEmail: form.primaryContactEmail.trim().toLowerCase(),
      aiConnectionLabel: form.aiConnectionLabel.trim(),
      updatedAt: new Date().toISOString(),
    };

    SafeJsonStorage.write(storageKey, normalized, 'configurações da organização');
    setForm(normalized);
    setMessage('Configurações salvas para este tenant.');
  };

  const fieldClass = 'w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Configurações do tenant</p>
          <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">Organização e integrações</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">Os dados abaixo pertencem exclusivamente ao tenant atual e não alteram configurações globais da Oi Beta.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Tenant {context.tenantId}
        </div>
      </header>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Dados institucionais</h2></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-[var(--text-secondary)]">Razão social<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.legalName} onChange={(e) => update('legalName', e.target.value)} /></label>
            <label className="text-xs font-bold text-[var(--text-secondary)]">Nome de exibição<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.displayName} onChange={(e) => update('displayName', e.target.value)} /></label>
            <label className="text-xs font-bold text-[var(--text-secondary)]">CNPJ ou documento<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.document} onChange={(e) => update('document', e.target.value)} /></label>
            <label className="text-xs font-bold text-[var(--text-secondary)]">Responsável principal<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.primaryContactName} onChange={(e) => update('primaryContactName', e.target.value)} /></label>
            <label className="text-xs font-bold text-[var(--text-secondary)] md:col-span-2">E-mail principal<input disabled={!canEdit} type="email" className={`${fieldClass} mt-2`} value={form.primaryContactEmail} onChange={(e) => update('primaryContactEmail', e.target.value)} /></label>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Identidade visual</h2></div>
            <label className="mt-5 block text-xs font-bold text-[var(--text-secondary)]">Identificação do tema<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.accentLabel} onChange={(e) => update('accentLabel', e.target.value)} /></label>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">Este lote registra a preferência do tenant sem modificar o tema global da aplicação.</p>
          </article>

          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Provedor externo de IA</h2></div>
            <label className="mt-5 block text-xs font-bold text-[var(--text-secondary)]">Provedor
              <select disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.aiProvider} onChange={(e) => update('aiProvider', e.target.value as ClientOrganizationSettings['aiProvider'])}>
                <option value="none">Nenhum</option><option value="openai">OpenAI</option><option value="google">Google</option><option value="anthropic">Anthropic</option><option value="local">IA local</option><option value="other">Outro</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold text-[var(--text-secondary)]">Nome da conexão<input disabled={!canEdit} className={`${fieldClass} mt-2`} value={form.aiConnectionLabel} onChange={(e) => update('aiConnectionLabel', e.target.value)} placeholder="Ex.: Conta corporativa" /></label>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">Nenhuma chave de API é armazenada nesta tela. A conexão segura continua sendo responsabilidade do mecanismo de integrações da plataforma.</p>
          </article>
        </section>

        {canEdit ? <button className="flex items-center gap-2 rounded-xl bg-[var(--blue-accent)] px-4 py-2 text-sm font-black text-white"><Save className="h-4 w-4" /> Salvar configurações</button> : <p className="text-sm text-[var(--text-secondary)]">Somente o administrador do tenant pode alterar estas configurações.</p>}
      </form>
    </div>
  );
}
