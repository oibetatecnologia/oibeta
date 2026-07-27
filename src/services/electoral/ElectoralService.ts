export interface ElectoralCampaignPayload {
  id?: string;
  name?: string;
  candidateName?: string;
  party?: string;
  office?: string;
  electionYear?: number;
  status?: 'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'SUSPENDED';
  description?: string;
  [key: string]: unknown;
}

export interface ElectoralTerritoryPayload {
  id?: string;
  name?: string;
  type?: 'REGION' | 'STATE' | 'CITY' | 'ZONE' | 'POLING_PLACE';
  parentId?: string;
  code?: string;
  [key: string]: unknown;
}

export interface ElectoralCoordinatorPayload {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  level?: 'REGIONAL' | 'MUNICIPAL' | 'ZONE' | 'LOCAL';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  assignedTerritory?: string;
  campaignId?: string;
  [key: string]: unknown;
}

export interface ElectoralInvitePayload {
  id?: string;
  campaignId?: string;
  email?: string;
  phone?: string;
  role?: string;
  assignedTerritoryId?: string;
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  createdAt?: string;
  inviteLink?: string;
  [key: string]: unknown;
}

export interface ElectoralAnalysisPayload {
  title: string;
  type: string;
  summary: string;
  metadata: unknown;
}

export interface ElectoralAnalysisQueryParams {
  campaignId?: string;
  territoryId?: string;
  limit?: string;
}

export class ElectoralService {
  private static getOrganizationId(user?: any): string {
    return user?.organizationId || 'org-oi-beta';
  }

  private static getWorkspaceId(user?: any): string {
    return user?.workspaceId || 'default-workspace';
  }

  private static getUserId(user?: any): string {
    return user?.id || 'dev-user-douglas';
  }

  private static tenantHeaders(user?: any): Record<string, string> {
    return {
      'x-organization-id': this.getOrganizationId(user),
      'x-workspace-id': this.getWorkspaceId(user),
      'x-user-id': this.getUserId(user),
    };
  }

  private static jsonHeaders(user?: any): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.tenantHeaders(user),
    };
  }

  private static withProjectId<T extends Record<string, unknown>>(payload: T, user?: any): T & { projectId: string } {
    return {
      ...payload,
      projectId: this.getWorkspaceId(user),
    };
  }

  private static async parseJsonResponse(response: Response, fallbackMessage: string): Promise<any> {
    let data: any = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || fallbackMessage);
    }

    return data;
  }

  public static async getSummary(user?: any): Promise<any> {
    const response = await fetch('/api/electoral/summary', {
      headers: this.tenantHeaders(user),
    });

    return this.parseJsonResponse(response, `Falha ao obter resumo eleitoral: ${response.statusText}`);
  }

  public static async createCampaign(campaignForm: Partial<ElectoralCampaignPayload>, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/campaign', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(this.withProjectId(campaignForm as Record<string, unknown>, user)),
    });

    return this.parseJsonResponse(response, 'Falha ao criar campanha eleitoral.');
  }

  public static async updateCampaign(campaignId: string, campaignForm: Partial<ElectoralCampaignPayload>, user?: any): Promise<any> {
    const response = await fetch(`/api/electoral/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(campaignForm),
    });

    return this.parseJsonResponse(response, 'Falha ao editar campanha.');
  }

  public static async createCoordinator(coordinatorForm: Partial<ElectoralCoordinatorPayload>, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/coordinator', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(this.withProjectId(coordinatorForm as Record<string, unknown>, user)),
    });

    return this.parseJsonResponse(response, 'Falha ao registrar coordenador.');
  }

  public static async updateCoordinator(coordinatorId: string, coordinatorForm: Partial<ElectoralCoordinatorPayload>, user?: any): Promise<any> {
    const response = await fetch(`/api/electoral/coordinators/${coordinatorId}`, {
      method: 'PUT',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(coordinatorForm),
    });

    return this.parseJsonResponse(response, 'Falha ao editar coordenador.');
  }

  public static async createTerritory(territoryForm: Partial<ElectoralTerritoryPayload>, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/territory', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(this.withProjectId(territoryForm as Record<string, unknown>, user)),
    });

    return this.parseJsonResponse(response, 'Falha ao registrar território.');
  }

  public static async createInvite(inviteForm: Partial<ElectoralInvitePayload>, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/invite', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(this.withProjectId(inviteForm as Record<string, unknown>, user)),
    });

    return this.parseJsonResponse(response, 'Falha ao gerar link de convite.');
  }

  public static buildInviteRecord(rawInvite: any, inviteForm: Partial<ElectoralInvitePayload>): any {
    return {
      id: rawInvite.id,
      campaignId: rawInvite.campaignId,
      email: rawInvite.email || inviteForm.email || undefined,
      phone: rawInvite.phone || inviteForm.phone || undefined,
      role: rawInvite.role || inviteForm.role || 'COORDINATOR',
      status: 'PENDING',
      createdAt: rawInvite.createdAt || new Date().toISOString(),
      inviteLink: rawInvite.inviteLink || `https://ais-pre.oi-beta.gov/accept-invite/${rawInvite.id}`,
    };
  }

  public static async acceptInvite(inviteId: string, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/invite/accept', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify({
        inviteId,
        name: 'Líder Regional Oi Beta',
        phone: '99999-8888',
      }),
    });

    return this.parseJsonResponse(response, 'Erro ao aceitar convite no backend');
  }

  public static async declineInvite(inviteId: string, user?: any): Promise<any> {
    const response = await fetch(`/api/electoral/invite/${inviteId}/decline`, {
      method: 'POST',
      headers: this.jsonHeaders(user),
    });

    return this.parseJsonResponse(response, 'Erro ao recusar convite');
  }

  public static async revokeInvite(inviteId: string, user?: any): Promise<any> {
    const response = await fetch(`/api/electoral/invite/${inviteId}/revoke`, {
      method: 'POST',
      headers: this.jsonHeaders(user),
    });

    return this.parseJsonResponse(response, 'Erro ao revogar convite');
  }

  public static async executeAnalysis(analysisType: string, params: ElectoralAnalysisQueryParams, user?: any): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params.campaignId) queryParams.set('campaignId', params.campaignId);
    if (params.territoryId) queryParams.set('territoryId', params.territoryId);
    queryParams.set('limit', params.limit || '10');

    const response = await fetch(`/api/electoral/analytics/${analysisType}?${queryParams.toString()}`, {
      headers: this.tenantHeaders(user),
    });

    return this.parseJsonResponse(response, 'Falha ao computar análise eleitoral.');
  }

  public static async saveAnalysis(payload: ElectoralAnalysisPayload, user?: any): Promise<any> {
    const response = await fetch('/api/electoral/analysis', {
      method: 'POST',
      headers: this.jsonHeaders(user),
      body: JSON.stringify(this.withProjectId(payload as unknown as Record<string, unknown>, user)),
    });

    return this.parseJsonResponse(response, 'Não foi possível salvar a análise.');
  }

  public static getInvitesStorageKey(organizationId?: string): string {
    return `invites_${organizationId || 'default'}`;
  }

  public static loadInvites(organizationId?: string): any[] {
    try {
      const localInvitesStr = localStorage.getItem(this.getInvitesStorageKey(organizationId));
      return localInvitesStr ? JSON.parse(localInvitesStr) : [];
    } catch {
      return [];
    }
  }

  public static saveInvites<T>(organizationId: string | undefined, invites: T[]): T[] {
    localStorage.setItem(this.getInvitesStorageKey(organizationId), JSON.stringify(invites));
    return invites;
  }

  public static downloadAnalysisJSON(analysis: any): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${analysis.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
