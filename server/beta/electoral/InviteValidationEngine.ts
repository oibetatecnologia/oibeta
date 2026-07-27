import { CampaignInvite } from "./CampaignInviteEngine";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";

export class InviteValidationEngine {
  constructor(private domainEngine: ElectoralDomainEngine) {}

  /**
   * Validates if a campaign invitation is fully eligible for use.
   * Asserts token, campaign exists, territory exists, and invite has not expired, declined or been revoked.
   */
  public async validateInvite(
    organizationId: string,
    invite: CampaignInvite
  ): Promise<{ valid: boolean; error?: string }> {
    // 1. Validate associated campaign
    const campaigns = await this.domainEngine.getCampaigns(organizationId);
    const campaignExists = campaigns.some(c => c.id === invite.campaignId);
    if (!campaignExists) {
      return { valid: false, error: "A campanha vinculada a este convite não foi localizada ou foi excluída." };
    }

    // 2. Validate associated territory (if specified)
    const terrId = invite.assignedTerritoryId || (invite as any).territoryId;
    if (terrId) {
      const territories = await this.domainEngine.getTerritories(organizationId);
      const territoryExists = territories.some(t => t.id === terrId);
      if (!territoryExists) {
        return { valid: false, error: "O território atribuído a este convite não existe ou foi removido." };
      }
    }

    // 3. Check revocation status
    if (invite.status === "REVOKED") {
      return { valid: false, error: "Este convite foi revogado por um administrador." };
    }

    // 4. Validate expiration bounds
    const isExpired = invite.status === "EXPIRED" || (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now());
    if (isExpired) {
      return { valid: false, error: "Este convite já expirou e não pode mais ser utilizado." };
    }

    // 5. Check redundancy
    if (invite.status === "ACCEPTED") {
      return { valid: false, error: "Este convite já foi aceito anteriormente." };
    }
    if (invite.status === "DECLINED") {
      return { valid: false, error: "Este convite foi recusado." };
    }

    return { valid: true };
  }
}
