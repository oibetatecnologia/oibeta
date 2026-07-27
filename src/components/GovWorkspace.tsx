import React, { useState } from 'react';
import GovHeader from './gov/GovHeader';
import GovLoadingState from './gov/GovLoadingState';
import GovErrorState from './gov/GovErrorState';
import GovFooter from './gov/GovFooter';
import GovNavigationTabs from './gov/GovNavigationTabs';
import GovContentRouter from './gov/GovContentRouter';
import GovDialogsLayer from './gov/GovDialogsLayer';
import { formatGovStatus, getGovProgramName, getGovProjectName, getGovIndicatorName } from './gov/utils/govFormatters';
import { useGovFilters } from './gov/hooks/useGovFilters';
import { useGovNavigation } from './gov/hooks/useGovNavigation';
import { useGovModals } from './gov/hooks/useGovModals';
import { useGovCrud } from './gov/hooks/useGovCrud';
import { useGovWorkspaceData } from './gov/hooks/useGovWorkspaceData';
import { GovViewService } from './gov/services/GovViewService';

interface GovWorkspaceProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projects?: any[];
  selectedProjectId?: string;
}

export default function GovWorkspace({
  user,
  activeTab,
  setActiveTab,
  projects = [],
  selectedProjectId
}: GovWorkspaceProps) {
  // Multitenancy: use selectedProjectId or fallback to first project id or pws-default
  const workspaceId = selectedProjectId || (projects && projects.length > 0 ? projects[0].id : 'pws-default');

  const { currentTab, handleTabChange } = useGovNavigation(activeTab, setActiveTab);

  const {
    loading,
    errorOnLoad,
    objectives,
    programs,
    projectsData,
    actions,
    indicators,
    goals,
    results,
    audits,
    compliances,
    monitorings,
    occurrences,
    briefs,
    snapshots,
    govReviews,
    reports,
    progSummary,
    perfSummary,
    loadGovWorkspaceData,
  } = useGovWorkspaceData(workspaceId);

  // Search, SearchTerm and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    createType,
    viewingDetail,
    detailType,
    formFields,
    setFormFields,
    formError,
    setFormError,
    formSubmitting,
    setFormSubmitting,
    openCreateModal,
    openDetail,
    closeDetail,
    resetForm,
  } = useGovModals({
    objectives,
    programs,
    projectsData,
    indicators,
  });

  const handleCreateSubmit = useGovCrud({
    workspaceId,
    createType,
    formFields,
    programs,
    projectsData,
    indicators,
    setIsCreateModalOpen,
    resetForm,
    loadGovWorkspaceData,
    setFormError,
    setFormSubmitting,
  });

  // Helper values checking
  const getProgramName = (id: string) => getGovProgramName(programs, id);
  const getProjectName = (id: string) => getGovProjectName(projectsData, id);
  const getIndicatorName = (id: string) => getGovIndicatorName(indicators, id);

  // Formatting utils
  const formatStatus = formatGovStatus;

  const {
    filteredPrograms,
    filteredProjects,
    filteredActions,
    filteredGoals,
  } = useGovFilters({
    programs,
    projectsData,
    actions,
    goals,
    searchTerm,
    statusFilter,
  });

  return (
    <div className="space-y-6">
      <GovHeader
        loading={loading}
        activeTab={currentTab}
        onRefresh={loadGovWorkspaceData}
        onCreate={openCreateModal}
      />

      <GovNavigationTabs
        currentTab={currentTab}
        onNavigate={handleTabChange}
      />

      {loading && <GovLoadingState />}

      {errorOnLoad && !loading && (
        <GovErrorState onRetry={loadGovWorkspaceData} />
      )}

      <GovContentRouter
        currentTab={currentTab}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        programs={programs}
        projectsData={projectsData}
        actions={actions}
        indicators={indicators}
        goals={goals}
        results={results}
        audits={audits}
        compliances={compliances}
        monitorings={monitorings}
        occurrences={occurrences}
        briefs={briefs}
        govReviews={govReviews}
        snapshots={snapshots}
        reports={reports}
        progSummary={progSummary}
        perfSummary={perfSummary}
        filteredPrograms={filteredPrograms}
        filteredProjects={filteredProjects}
        filteredActions={filteredActions}
        filteredGoals={filteredGoals}
        setActiveTab={handleTabChange}
        getProgramName={getProgramName}
        getProjectName={getProjectName}
        getIndicatorName={getIndicatorName}
        formatStatus={formatStatus}
        onView={openDetail}
      />

      <GovDialogsLayer
        viewingDetail={viewingDetail}
        detailType={detailType}
        onCloseDetail={closeDetail}
        formatStatus={formatStatus}
        isCreateModalOpen={isCreateModalOpen}
        createType={createType}
        formFields={formFields}
        setFormFields={setFormFields}
        formError={formError}
        formSubmitting={formSubmitting}
        programs={programs}
        projectsData={projectsData}
        indicators={indicators}
        onCloseCreate={() => setIsCreateModalOpen(false)}
        onSubmitCreate={handleCreateSubmit}
      />

      <GovFooter
        workspaceId={workspaceId}
        healthLabel={GovViewService.getWorkspaceHealthLabel({
          programs,
          projectsData,
          actions,
          goals,
        })}
      />

    </div>
  );
}
