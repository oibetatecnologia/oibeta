import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  PauseCircle,
  PlayCircle,
  Save,
  RotateCcw,
  XCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { AdminDirectoryService } from '../../core/admin/AdminDirectoryService';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';
import type { PlatformUserDefinition, PlatformUserProfile } from '../../core/users/UserRegistry';

const PROFILES: Array<{ value: PlatformUserProfile; label: string }> = [
  { value: 'executive', label: 'Executivo' },
  { value: 'manager', label: 'Gestor' },
  { value: 'operator', label: 'Operador' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'public_user', label: 'Consulta' },
];

export default function ClientUsersWorkspace() {
  const { user } = useWorkspace().tenant;
  const access = ProductAccessService.buildSnapshot(user);
  const canManage = String(user?.role || '').toLowerCase() === 'tenant_admin';
  const currentUserId = String(user?.id || '');
  const [users, setUsers] = useState<PlatformUserDefinition[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<PlatformUserProfile>('operator');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(access.licensedProductIds);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>();
  const [invitationActionId, setInvitationActionId] = useState<string>();
  const [editing, setEditing] = useState<Record<string, PlatformUserDefinition>>({});

  const products = useMemo(
    () => access.availableProducts.filter((product) => product.tabs.length > 0),
    [access.availableProducts],
  );

  const load = async () => {
    setLoading(true);
    try {
      const items = await AdminDirectoryService.listUsers();
      setUsers(items);
      setEditing(Object.fromEntries(items.map((item) => [item.id, { ...item, productIds: [...item.productIds] }])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    try {
      await AdminDirectoryService.inviteUser({
        name,
        email,
        profile,
        roleLabel: PROFILES.find((item) => item.value === profile)?.label || profile,
        productIds: selectedProducts.filter((id) => access.licensedProductIds.includes(id)),
      });
      setName('');
      setEmail('');
      setProfile('operator');
      setSelectedProducts(access.licensedProductIds);
      setMessage('Usuário convidado com os produtos permitidos pelo tenant.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const resendInvitation = async (userId: string) => {
    setInvitationActionId(userId);
    setMessage(undefined);
    try {
      await AdminDirectoryService.resendInvitation(userId);
      setMessage('Convite reenviado com sucesso.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setInvitationActionId(undefined);
    }
  };

  const cancelInvitation = async (userId: string) => {
    setInvitationActionId(userId);
    setMessage(undefined);
    try {
      await AdminDirectoryService.cancelInvitation(userId);
      setMessage('Convite cancelado. O registro foi preservado para auditoria.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setInvitationActionId(undefined);
    }
  };

  const updateDraft = (userId: string, patch: Partial<PlatformUserDefinition>) => {
    setEditing((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }));
  };

  const toggleDraftProduct = (userId: string, productId: string) => {
    const draft = editing[userId];
    if (!draft) return;
    const selected = draft.productIds.includes(productId);
    updateDraft(userId, {
      productIds: selected
        ? draft.productIds.filter((id) => id !== productId)
        : [...draft.productIds, productId],
    });
  };

  const saveUser = async (userId: string) => {
    const draft = editing[userId];
    if (!draft) return;
    setSavingId(userId);
    setMessage(undefined);
    try {
      await AdminDirectoryService.updateUser(userId, {
        name: draft.name.trim(),
        profile: draft.profile,
        roleLabel: PROFILES.find((item) => item.value === draft.profile)?.label || draft.roleLabel,
        status: draft.status,
        productIds: draft.productIds.filter((id) => access.licensedProductIds.includes(id)),
      });
      setMessage('Acesso do usuário atualizado com sucesso.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingId(undefined);
    }
  };

  const summary = useMemo(() => ({
    active: users.filter((item) => item.status === 'active').length,
    invited: users.filter((item) => item.status === 'invited').length,
    paused: users.filter((item) => item.status === 'paused' || item.status === 'inactive').length,
  }), [users]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Acessos do tenant</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">Usuários da organização</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Cada usuário recebe somente os produtos contratados e explicitamente autorizados.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Ativos</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.active}</p></article>
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Convites pendentes</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.invited}</p></article>
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Pausados ou inativos</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.paused}</p></article>
      </section>

      {message && <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-main)]">{message}</div>}

      {canManage && (
        <form onSubmit={invite} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Convidar usuário</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-main)]" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-main)]" />
            <select value={profile} onChange={(e) => setProfile(e.target.value as PlatformUserProfile)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-main)]">
              {PROFILES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {products.map((product) => {
              const selected = selectedProducts.includes(product.id);
              return <button type="button" key={product.id} onClick={() => setSelectedProducts((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{product.commercialName}</button>;
            })}
          </div>
          <button className="mt-5 rounded-xl bg-[var(--blue-accent)] px-4 py-2 text-sm font-black text-white">Enviar convite</button>
        </form>
      )}

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Equipe</h2></div>
        <div className="mt-5 space-y-4">
          {loading && <p className="text-sm text-[var(--text-secondary)]">Carregando usuários...</p>}
          {!loading && users.map((item) => {
            const draft = editing[item.id] || item;
            const isCurrentUser = item.id === currentUserId;
            return (
              <article key={item.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-[var(--text-main)]">{item.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]"><Mail className="h-3 w-3" />{item.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 text-xs font-bold text-[var(--text-main)]"><ShieldCheck className="h-3 w-3" />{item.roleLabel || item.profile}</p>
                    <p className="mt-1 text-[10px] uppercase text-[var(--text-secondary)]">{item.productIds.length} produto(s) • {item.status}</p>
                  </div>
                </div>

                {canManage && item.status === 'invited' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                    <button type="button" disabled={invitationActionId === item.id} onClick={() => void resendInvitation(item.id)} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-main)] disabled:opacity-50"><RotateCcw className="h-4 w-4" />Reenviar convite</button>
                    <button type="button" disabled={invitationActionId === item.id} onClick={() => void cancelInvitation(item.id)} className="flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"><XCircle className="h-4 w-4" />Cancelar convite</button>
                  </div>
                )}

                {canManage && item.profile !== 'master_admin' && item.status !== 'invited' && (
                  <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input value={draft.name} onChange={(event) => updateDraft(item.id, { name: event.target.value })} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-main)]" />
                      <select value={draft.profile} onChange={(event) => updateDraft(item.id, { profile: event.target.value as PlatformUserProfile })} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-main)]">
                        {item.profile === 'tenant_admin' && <option value="tenant_admin">Administrador do cliente</option>}
                        {PROFILES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <button type="button" disabled={isCurrentUser} onClick={() => updateDraft(item.id, { status: draft.status === 'active' ? 'paused' : 'active' })} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-40">
                        {draft.status === 'active' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        {draft.status === 'active' ? 'Pausar' : 'Ativar'}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {products.map((product) => {
                        const selected = draft.productIds.includes(product.id);
                        return <button type="button" key={product.id} onClick={() => toggleDraftProduct(item.id, product.id)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{selected && <CheckCircle2 className="mr-1 inline h-3 w-3" />}{product.commercialName}</button>;
                      })}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button type="button" disabled={savingId === item.id} onClick={() => void saveUser(item.id)} className="flex items-center gap-2 rounded-xl bg-[var(--blue-accent)] px-4 py-2 text-xs font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{savingId === item.id ? 'Salvando...' : 'Salvar acesso'}</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
