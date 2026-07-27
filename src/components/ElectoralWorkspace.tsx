import React, { useState, useEffect } from 'react';
import { ElectoralService } from '../services/electoral/ElectoralService';
import ElectoralDashboard from './electoral/ElectoralDashboard';
import ElectoralCampaigns from './electoral/ElectoralCampaigns';
import ElectoralTerritories from './electoral/ElectoralTerritories';
import ElectoralCoordinators from './electoral/ElectoralCoordinators';
import ElectoralInvites from './electoral/ElectoralInvites';
import ElectoralAnalyses from './electoral/ElectoralAnalyses';
import ElectoralReports from './electoral/ElectoralReports';
import ElectoralCampaignModal from './electoral/modals/ElectoralCampaignModal';
import ElectoralTerritoryModal from './electoral/modals/ElectoralTerritoryModal';
import ElectoralCoordinatorModal from './electoral/modals/ElectoralCoordinatorModal';
import ElectoralInviteModal from './electoral/modals/ElectoralInviteModal';
import ElectoralCampaignViewModal from './electoral/modals/ElectoralCampaignViewModal';
import ElectoralCoordinatorViewModal from './electoral/modals/ElectoralCoordinatorViewModal';
import ElectoralHeader from './electoral/ElectoralHeader';
import ElectoralNavigationTabs from './electoral/ElectoralNavigationTabs';
import ElectoralLoadingState from './electoral/ElectoralLoadingState';
import ElectoralErrorState from './electoral/ElectoralErrorState';
import ElectoralFooter from './electoral/ElectoralFooter';
import type { Campaign, Territory, Coordinator, SavedAnalysis, Invite } from './electoral/types';
import { getStatusBadge, getInviteStatusBadge } from './electoral/utils/statusBadges';
import { useElectoralDashboard } from './electoral/hooks/useElectoralDashboard';
import { useElectoralNavigation } from './electoral/hooks/useElectoralNavigation';
import {
  createDefaultCampaignForm,
  createDefaultCoordinatorForm,
  createDefaultInviteForm,
  createDefaultTerritoryForm,
} from './electoral/constants/defaultForms';
import { CampaignCrudService } from './electoral/services/CampaignCrudService';
import { CoordinatorCrudService } from './electoral/services/CoordinatorCrudService';
import { TerritoryCrudService } from './electoral/services/TerritoryCrudService';
import { InviteCrudService } from './electoral/services/InviteCrudService';
import { AnalysisCrudService } from './electoral/services/AnalysisCrudService';

interface ElectoralWorkspaceProps {
  user: any;
  setActiveTab: (tab: string) => void;
  activeTab: string;
}


export default function ElectoralWorkspace({ user, setActiveTab, activeTab }: ElectoralWorkspaceProps) {
  // Navigation
  const { currentSubTab, handleSubTabChange } = useElectoralNavigation(activeTab, setActiveTab);

  // Backend States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);


  // Modal / Form States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState<Partial<Campaign>>(createDefaultCampaignForm());
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);

  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false);
  const [territoryForm, setTerritoryForm] = useState<Partial<Territory>>(createDefaultTerritoryForm());

  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [coordinatorForm, setCoordinatorForm] = useState<Partial<Coordinator>>(createDefaultCoordinatorForm());
  const [editingCoordinatorId, setEditingCoordinatorId] = useState<string | null>(null);
  const [viewingCoordinator, setViewingCoordinator] = useState<Coordinator | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<Partial<Invite>>(createDefaultInviteForm());

  // Analysis state
  const [analysisType, setAnalysisType] = useState<string>('historical');
  const [analysisQueryParams, setAnalysisQueryParams] = useState({
    campaignId: '',
    territoryId: '',
    limit: '10'
  });
  const [executingAnalysis, setExecutingAnalysis] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisSaveTitle, setAnalysisSaveTitle] = useState<string>('');
  const [savingAnalysis, setSavingAnalysis] = useState<boolean>(false);

  // Report visualization modal
  const [viewingReport, setViewingReport] = useState<SavedAnalysis | null>(null);

  const dashboardMetrics = useElectoralDashboard({
    campaigns,
    territories,
    coordinators,
    invites,
    savedAnalyses,
  });

  // Initial Load & Refresh
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dataSummary = await ElectoralService.getSummary(user);
      const loadedInvites = ElectoralService.loadInvites(user?.organizationId) as Invite[];

      setCampaigns(dataSummary.campaigns || []);
      setTerritories(dataSummary.territories || []);
      setCoordinators(dataSummary.coordinators || []);
      setSavedAnalyses(dataSummary.analyses || []);
      setInvites(loadedInvites);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erro desconhecido ao carregar cockpit eleitoral.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [user?.organizationId]);

  // Campaign CRUD
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await CampaignCrudService.create(campaignForm, user);
      setIsCampaignModalOpen(false);
      setCampaignForm(createDefaultCampaignForm());
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  const handleEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaignId) return;
    try {
      await CampaignCrudService.update(editingCampaignId, campaignForm, user);
      setIsCampaignModalOpen(false);
      setEditingCampaignId(null);
      setCampaignForm(createDefaultCampaignForm());
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  const startEditCampaign = (camp: Campaign) => {
    setEditingCampaignId(camp.id);
    setCampaignForm(CampaignCrudService.prepareEditForm(camp));
    setIsCampaignModalOpen(true);
  };

  // Coordinator CRUD
  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await CoordinatorCrudService.create(coordinatorForm, user);
      setIsCoordinatorModalOpen(false);
      setCoordinatorForm(createDefaultCoordinatorForm());
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  const handleEditCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoordinatorId) return;
    try {
      await CoordinatorCrudService.update(editingCoordinatorId, coordinatorForm, user);
      setIsCoordinatorModalOpen(false);
      setEditingCoordinatorId(null);
      setCoordinatorForm(createDefaultCoordinatorForm());
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  const startEditCoordinator = (coor: Coordinator) => {
    setEditingCoordinatorId(coor.id);
    setCoordinatorForm(CoordinatorCrudService.prepareEditForm(coor));
    setIsCoordinatorModalOpen(true);
  };

  // Territory Creation
  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await TerritoryCrudService.create(territoryForm, user);
      setIsTerritoryModalOpen(false);
      setTerritoryForm(createDefaultTerritoryForm());
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  // Invites actions
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedList = await InviteCrudService.create(inviteForm, user, invites);
      setInvites(updatedList);
      setIsInviteModalOpen(false);
      setInviteForm(createDefaultInviteForm());
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  // Accept Invite action
  const handleAcceptInviteInUI = async (inviteId: string) => {
    try {
      const updated = await InviteCrudService.accept(inviteId, user, invites);
      setInvites(updated);
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  // Decline Invite action
  const handleDeclineInviteInUI = async (inviteId: string) => {
    try {
      const updated = await InviteCrudService.decline(inviteId, user, invites);
      setInvites(updated);
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  // Revoke Invite action
  const handleRevokeInviteInUI = async (inviteId: string) => {
    try {
      const updated = await InviteCrudService.revoke(inviteId, user, invites);
      setInvites(updated);
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    }
  }

  // Delete Invite from locally listed
  const handleDeleteInviteInUI = (inviteId: string) => {
    const updated = InviteCrudService.deleteLocal(inviteId, user, invites);
    setInvites(updated);
  }

  // Run Analyses
  const executeAnalysisEngine = async () => {
    setExecutingAnalysis(true);
    setAnalysisResult(null);
    try {
      const result = await AnalysisCrudService.execute(analysisType, analysisQueryParams, user);
      setAnalysisResult(result);
      setAnalysisSaveTitle(AnalysisCrudService.createDefaultTitle(analysisType));
    } catch(e: any) {
      alert(e.message);
    } finally {
      setExecutingAnalysis(false);
    }
  }

  // Save Executed Analysis result onto database
  const saveExecutedAnalysis = async () => {
    if (!analysisResult) return;
    setSavingAnalysis(true);
    try {
      await AnalysisCrudService.save({
        title: analysisSaveTitle,
        type: analysisType,
        queryParams: analysisQueryParams,
        result: analysisResult,
      }, user);

      alert("Análise salva com sucesso como relatório corporativo!");
      setAnalysisResult(null);
      await fetchData();
    } catch(e: any) {
      alert(e.message);
    } finally {
      setSavingAnalysis(false);
    }
  }

  // Download Analysis file
  const downloadAnalysisJSON = (analysis: SavedAnalysis) => {
    AnalysisCrudService.downloadJSON(analysis);
  }


  return (
    <div className="space-y-6 h-full flex flex-col justify-between" id="beta-electoral-cockpit">
      <ElectoralHeader
        loading={loading}
        onRefresh={fetchData}
      />

      <ElectoralNavigationTabs
        currentSubTab={currentSubTab}
        onNavigate={handleSubTabChange}
      />

      {/* Loading & Error States */}
      {loading && <ElectoralLoadingState />}

      {error && !loading && (
        <ElectoralErrorState
          error={error}
          onRetry={fetchData}
        />
      )}

      {/* Workspace content sections */}
      {!loading && !error && (
        <div className="flex-1 mt-6">
          
          {/* ==================== SUB-TAB 1: DASHBOARD ==================== */}
          {currentSubTab === 'dashboard' && (
            <ElectoralDashboard
              dashboardMetrics={dashboardMetrics}
              campaigns={campaigns}
              territories={territories}
              coordinators={coordinators}
              onNavigate={handleSubTabChange}
            />
          )}

          {/* ==================== SUB-TAB 2: CAMPANHAS ==================== */}
          {currentSubTab === 'campaigns' && (
            <ElectoralCampaigns
              campaigns={campaigns}
              onCreate={() => {
                setEditingCampaignId(null);
                setCampaignForm(createDefaultCampaignForm());
                setIsCampaignModalOpen(true);
              }}
              onView={setViewingCampaign}
              onEdit={startEditCampaign}
              getStatusBadge={getStatusBadge}
            />
          )}

          {/* ==================== SUB-TAB 3: TERRITÓRIOS ==================== */}
          {currentSubTab === 'territories' && (
            <ElectoralTerritories
              territories={territories}
              onCreate={() => setIsTerritoryModalOpen(true)}
            />
          )}

          {/* ==================== SUB-TAB 4: COORDENADORES ==================== */}
          {currentSubTab === 'coordinators' && (
            <ElectoralCoordinators
              coordinators={coordinators}
              onCreate={() => {
                setEditingCoordinatorId(null);
                setCoordinatorForm(createDefaultCoordinatorForm());
                setIsCoordinatorModalOpen(true);
              }}
              onView={setViewingCoordinator}
              onEdit={startEditCoordinator}
            />
          )}

          {/* ==================== SUB-TAB 5: CONVITES ==================== */}
          {currentSubTab === 'invites' && (
            <ElectoralInvites
              invites={invites}
              onCreate={() => setIsInviteModalOpen(true)}
              onAccept={handleAcceptInviteInUI}
              onDecline={handleDeclineInviteInUI}
              onRevoke={handleRevokeInviteInUI}
              onDelete={handleDeleteInviteInUI}
              getInviteStatusBadge={getInviteStatusBadge}
            />
          )}

          {/* ==================== SUB-TAB 6: ANÁLISES ==================== */}
          {currentSubTab === 'analyses' && (
            <ElectoralAnalyses
              analysisType={analysisType}
              setAnalysisType={setAnalysisType}
              analysisQueryParams={analysisQueryParams}
              setAnalysisQueryParams={setAnalysisQueryParams}
              campaigns={campaigns}
              territories={territories}
              executingAnalysis={executingAnalysis}
              analysisResult={analysisResult}
              analysisSaveTitle={analysisSaveTitle}
              setAnalysisSaveTitle={setAnalysisSaveTitle}
              savingAnalysis={savingAnalysis}
              executeAnalysisEngine={executeAnalysisEngine}
              saveExecutedAnalysis={saveExecutedAnalysis}
              setAnalysisResult={setAnalysisResult}
            />
          )}

          {/* ==================== SUB-TAB 7: RELATÓRIOS (ANALISES SALVAS) ==================== */}
          {currentSubTab === 'reports' && (
            <ElectoralReports
              savedAnalyses={savedAnalyses}
              onNavigate={handleSubTabChange}
              onView={setViewingReport}
              onDownload={downloadAnalysisJSON}
            />
          )}

        </div>
      )}

      {/* ==================== CAMPAIGN CREATE / EDIT MODAL ==================== */}
      {isCampaignModalOpen && (
        <ElectoralCampaignModal
          editingCampaignId={editingCampaignId}
          campaignForm={campaignForm}
          setCampaignForm={setCampaignForm}
          onClose={() => setIsCampaignModalOpen(false)}
          onSubmit={editingCampaignId ? handleEditCampaign : handleCreateCampaign}
        />
      )}

      {/* ==================== GEOGRAPHY / TERRITORY CREATION MODAL ==================== */}
      {isTerritoryModalOpen && (
        <ElectoralTerritoryModal
          territoryForm={territoryForm}
          setTerritoryForm={setTerritoryForm}
          territories={territories}
          onClose={() => setIsTerritoryModalOpen(false)}
          onSubmit={handleCreateTerritory}
        />
      )}

      {/* ==================== COORDINATOR MODAL ==================== */}
      {isCoordinatorModalOpen && (
        <ElectoralCoordinatorModal
          editingCoordinatorId={editingCoordinatorId}
          coordinatorForm={coordinatorForm}
          setCoordinatorForm={setCoordinatorForm}
          campaigns={campaigns}
          onClose={() => setIsCoordinatorModalOpen(false)}
          onSubmit={editingCoordinatorId ? handleEditCoordinator : handleCreateCoordinator}
        />
      )}

      {/* ==================== INVITATION ISSUANCE MODAL ==================== */}
      {isInviteModalOpen && (
        <ElectoralInviteModal
          inviteForm={inviteForm}
          setInviteForm={setInviteForm}
          campaigns={campaigns}
          territories={territories}
          onClose={() => setIsInviteModalOpen(false)}
          onSubmit={handleCreateInvite}
        />
      )}

      {/* ==================== GENERAL VIEW VISUALIZATION MODALS ==================== */}
      {viewingCampaign && (
        <ElectoralCampaignViewModal
          campaign={viewingCampaign}
          onClose={() => setViewingCampaign(null)}
          getStatusBadge={getStatusBadge}
        />
      )}

      {viewingCoordinator && (
        <ElectoralCoordinatorViewModal
          coordinator={viewingCoordinator}
          onClose={() => setViewingCoordinator(null)}
        />
      )}

      <ElectoralFooter
        organizationId={user?.organizationId}
      />
    </div>
  );
}
