import React, { useMemo, useState } from 'react';
import { Mail, RefreshCw, ShieldCheck, UserPlus, Users, Workflow } from 'lucide-react';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import { UserService } from '../../core/users/UserService';
import { PermissionPolicyService } from '../../core/security/PermissionPolicyService';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useSessionHealth from '../../hooks/useSessionHealth';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useAdminAudit from '../../hooks/useAdminAudit';
import type { PlatformUserProfile } from '../../core/users/UserRegistry';
import {
  UserChecklistItem,
  UserMetricCard,
  UserStatusBadge,
} from './UserManagementComponents';

const PROFILE_OPTIONS: PlatformUserProfile[] = [
  'tenant_admin',
  'executive',
  'manager',
  'operator',
  'auditor',
];

export default function UserManagementView() {
  const platform = usePlatformContext();
  const productionReadiness = useProductionReadiness();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();
  const directory = useAdminDirectory();
  const adminAudit = useAdminAudit(50);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<PlatformUserProfile>('operator');
  const [department, setDepartment] = useState('');

  const users = useMemo(() => {
    if (directory.users.length > 0) return directory.users;

    return UserService.buildOperationalSnapshot({
      tenantId: platform.currentTenant.id,
      organizationId: platform.currentTenant.organizationId,
      currentUser: platform.currentUser,
      availableProducts: platform.availableProducts,
    }).users;
  }, [
    directory.users,
    platform.availableProducts,
    platform.currentTenant.id,
    platform.currentTenant.organizationId,
    platform.currentUser,
  ]);

  const activeUsers = users.filter((user) => user.status === 'active').length;
  const invitedUsers = users.filter((user) => user.status === 'invited').length;
  const tenantAdmins = users.filter((user) => user.profile === 'tenant_admin').length;
  const permissionSummary = PermissionPolicyService.buildCoverageSummary(users);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;

    await directory.inviteUser({
      tenantId: platform.currentTenant.id,
      name: name.trim(),
      email: email.trim(),
      profile,
      roleLabel: UserService.getProfileLabel(profile),
      department: department.trim() || undefined,
      productIds: platform.availableProducts.map((product) => product.id),
    });

    await adminAudit.refresh();

    setName('');
    setEmail('');
    setDepartment('');
    setProfile('operator');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">
            Beta Core Admin / Usuários
          </span>
          <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--blue-accent)]" />
            Gestão de Usuários
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
            Diretório administrativo conectado ao backend, com convites, perfis, hierarquia e permissões por tenant.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void directory.refresh()}
          disabled={directory.isLoading}
          className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${directory.isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {directory.error && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
          {directory.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <UserMetricCard icon={<Users className="w-4 h-4" />} label="Usuários" value={users.length} helper={`${activeUsers} ativos`} />
        <UserMetricCard icon={<Mail className="w-4 h-4" />} label="Convites" value={invitedUsers} helper={`${adminAudit.summary.invitedUsers} auditados`} />
        <UserMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Admins do cliente" value={tenantAdmins} helper="Gestão delegada" />
        <UserMetricCard icon={<Workflow className="w-4 h-4" />} label="Permissões" value={`${permissionSummary.averagePermissionCoverage}%`} helper={`${accessControl.score}% no backend`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h4 className="text-sm font-black text-[var(--text-main)]">Usuários do tenant</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              {directory.isLoading ? 'Carregando diretório...' : `${users.length} registro(s) disponíveis.`}
            </p>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="p-4 bg-[var(--bg-main)]/35 border border-[var(--border-color)] rounded-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-[var(--text-main)]">{user.name}</span>
                    <UserStatusBadge status={user.status} label={UserService.getStatusLabel(user.status)} />
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)] space-y-0.5">
                    <p className="font-mono">{user.email}</p>
                    <p>{UserService.getProfileLabel(user.profile)} · {user.roleLabel}</p>
                    <p>{user.department || 'Departamento não definido'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start lg:items-end gap-1 text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>{user.productIds.length} produtos</span>
                  <span>{UserService.getDelegationScope(user.profile)}</span>
                  <span>{PermissionPolicyService.getPermissions(user.profile).length} permissões</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleInvite} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" />
              Convidar usuário
            </h4>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" type="email" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <select value={profile} onChange={(event) => setProfile(event.target.value as PlatformUserProfile)} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]">
              {PROFILE_OPTIONS.map((item) => <option key={item} value={item}>{UserService.getProfileLabel(item)}</option>)}
            </select>
            <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Departamento" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <button type="submit" disabled={directory.isSaving || !name.trim() || !email.trim()} className="w-full px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-xs font-black disabled:opacity-50">
              {directory.isSaving ? 'Enviando...' : 'Enviar convite'}
            </button>
          </form>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)]">Capacidade administrativa</h4>
            <div className="space-y-2">
              <UserChecklistItem label="CRUD backend de usuários" done />
              <UserChecklistItem label="Auditoria de convites e alterações" done={!adminAudit.error} />
              <UserChecklistItem label="Convite por e-mail" done={sessionHealth.tokenRequired} />
              <UserChecklistItem label="Persistência JSON local" done />
              <UserChecklistItem label="Persistência Supabase" done={productionReadiness.score >= 80} />
              <UserChecklistItem label="RBAC por tenant" done={accessControl.score >= 80} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
