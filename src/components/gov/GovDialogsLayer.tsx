import React from 'react';
import GovCreateDialog from './GovCreateDialog';
import GovDetailDialog from './GovDetailDialog';

interface GovDialogsLayerProps {
  viewingDetail: any;
  detailType: string;
  onCloseDetail: () => void;
  formatStatus: (status: string) => string;

  isCreateModalOpen: boolean;
  createType: string;
  formFields: any;
  setFormFields: React.Dispatch<React.SetStateAction<any>>;
  formError: string;
  formSubmitting: boolean;
  programs: any[];
  projectsData: any[];
  indicators: any[];
  onCloseCreate: () => void;
  onSubmitCreate: (event: React.FormEvent) => void;
}

/**
 * GovDialogsLayer
 *
 * Camada oficial de dialogs do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar modais e dialogs do workspace Gov;
 * - manter o GovWorkspace focado em orquestração;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovDialogsLayer({
  viewingDetail,
  detailType,
  onCloseDetail,
  formatStatus,
  isCreateModalOpen,
  createType,
  formFields,
  setFormFields,
  formError,
  formSubmitting,
  programs,
  projectsData,
  indicators,
  onCloseCreate,
  onSubmitCreate,
}: GovDialogsLayerProps) {
  return (
    <>
      {viewingDetail && (
        <GovDetailDialog
          detail={viewingDetail}
          detailType={detailType}
          onClose={onCloseDetail}
          formatStatus={formatStatus}
        />
      )}

      {isCreateModalOpen && (
        <GovCreateDialog
          createType={createType}
          formFields={formFields}
          setFormFields={setFormFields}
          formError={formError}
          formSubmitting={formSubmitting}
          programs={programs}
          projectsData={projectsData}
          indicators={indicators}
          onClose={onCloseCreate}
          onSubmit={onSubmitCreate}
        />
      )}
    </>
  );
}
