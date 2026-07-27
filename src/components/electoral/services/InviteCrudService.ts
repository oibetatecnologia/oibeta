import { ElectoralService } from '../../../services/electoral/ElectoralService';
import type { Invite } from '../types';

/**
 * InviteCrudService
 *
 * Serviço operacional de convites eleitorais.
 * Centraliza ações que antes ficavam no ElectoralWorkspace.
 */
export const InviteCrudService = {
  async create(form: Partial<Invite>, user: any, currentInvites: Invite[]): Promise<Invite[]> {
    const rawInvite = await ElectoralService.createInvite(form, user);
    const newInviteRecord = ElectoralService.buildInviteRecord(rawInvite, form) as Invite;
    return ElectoralService.saveInvites(user?.organizationId, [newInviteRecord, ...currentInvites]) as Invite[];
  },

  async accept(inviteId: string, user: any, currentInvites: Invite[]): Promise<Invite[]> {
    await ElectoralService.acceptInvite(inviteId, user);
    const updated = currentInvites.map((invite) => invite.id === inviteId ? { ...invite, status: 'ACCEPTED' as const } : invite);
    return ElectoralService.saveInvites(user?.organizationId, updated) as Invite[];
  },

  async decline(inviteId: string, user: any, currentInvites: Invite[]): Promise<Invite[]> {
    await ElectoralService.declineInvite(inviteId, user);
    const updated = currentInvites.map((invite) => invite.id === inviteId ? { ...invite, status: 'DECLINED' as const } : invite);
    return ElectoralService.saveInvites(user?.organizationId, updated) as Invite[];
  },

  async revoke(inviteId: string, user: any, currentInvites: Invite[]): Promise<Invite[]> {
    await ElectoralService.revokeInvite(inviteId, user);
    const updated = currentInvites.map((invite) => invite.id === inviteId ? { ...invite, status: 'REVOKED' as const } : invite);
    return ElectoralService.saveInvites(user?.organizationId, updated) as Invite[];
  },

  deleteLocal(inviteId: string, user: any, currentInvites: Invite[]): Invite[] {
    const updated = currentInvites.filter((invite) => invite.id !== inviteId);
    return ElectoralService.saveInvites(user?.organizationId, updated) as Invite[];
  },
};
