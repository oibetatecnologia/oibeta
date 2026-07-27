import React from 'react';
import LicitaContentRouter from './licita/LicitaContentRouter';
import LicitaErrorFeedback from './licita/components/LicitaErrorFeedback';
import LicitaFooter from './licita/components/LicitaFooter';
import LicitaHeader from './licita/components/LicitaHeader';
import LicitaLoadingState from './licita/components/LicitaLoadingState';
import LicitaCreateDialog from './licita/dialogs/LicitaCreateDialog';
import LicitaDetailDialog from './licita/dialogs/LicitaDetailDialog';
import LicitaEditDialog from './licita/dialogs/LicitaEditDialog';
import { useLicitaWorkspaceController } from './licita/hooks/useLicitaWorkspaceController';

interface LicitaWorkspaceProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projects?: any[];
  selectedProjectId?: string;
}

export default function LicitaWorkspace({
  user,
  activeTab,
  setActiveTab,
  projects = [],
  selectedProjectId
}: LicitaWorkspaceProps) {
  const workspaceId = selectedProjectId || (projects && projects.length > 0 ? projects[0].id : 'pws-default');

  const {
    loading,
    errorOnLoad,
    initializingWorkspace,
    opportunities,
    bids,
    suppliers,
    contracts,
    arps,
    auditEvents,
    complianceEvents,
    reports,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    viewingDetail,
    setViewingDetail,
    detailType,
    setDetailType,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createType,
    isEditModalOpen,
    setIsEditModalOpen,
    formFields,
    setFormFields,
    formError,
    formSubmitting,
    buildAndLoadWorkspace,
    handleCreateSubmit,
    handleEditSubmit,
    openCreateModal,
    openEditModal,
  } = useLicitaWorkspaceController(workspaceId);

  const recordsCount =
    opportunities.length +
    bids.length +
    suppliers.length +
    contracts.length +
    arps.length +
    auditEvents.length +
    complianceEvents.length +
    reports.length;

  return (
    <div className="space-y-6 animate-fade-in text-[var(--text-main)] max-w-7xl mx-auto px-1 sm:px-2">
      <LicitaHeader
        workspaceId={workspaceId}
        selectedProjectId={selectedProjectId}
        loading={loading}
        onSync={buildAndLoadWorkspace}
      />

      {errorOnLoad && <LicitaErrorFeedback />}

      {loading && <LicitaLoadingState initializingWorkspace={initializingWorkspace} />}

      {!loading && (
        <>
          <LicitaContentRouter
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            opportunities={opportunities}
            bids={bids}
            suppliers={suppliers}
            contracts={contracts}
            arps={arps}
            auditEvents={auditEvents}
            complianceEvents={complianceEvents}
            reports={reports}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            setViewingDetail={setViewingDetail}
            setDetailType={setDetailType}
            openCreateModal={openCreateModal}
            openEditModal={openEditModal}
          />

          <LicitaFooter workspaceId={workspaceId} recordsCount={recordsCount} />
        </>
      )}

      <LicitaDetailDialog
        viewingDetail={viewingDetail}
        detailType={detailType}
        onClose={() => setViewingDetail(null)}
      />

      {isCreateModalOpen && (
        <LicitaCreateDialog
          createType={createType}
          formFields={formFields}
          setFormFields={setFormFields}
          formError={formError}
          formSubmitting={formSubmitting}
          handleCreateSubmit={handleCreateSubmit}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isEditModalOpen && (
        <LicitaEditDialog
          createType={createType}
          formFields={formFields}
          setFormFields={setFormFields}
          formSubmitting={formSubmitting}
          handleEditSubmit={handleEditSubmit}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
