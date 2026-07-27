import { useState } from 'react';
import { createDefaultGovFormFields } from '../constants/defaultForms';

interface UseGovModalsParams {
  objectives: any[];
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

/**
 * useGovModals
 *
 * Centraliza estado de dialogs, detalhes e formulário do Beta Gov.
 */
export function useGovModals({
  objectives,
  programs,
  projectsData,
  indicators,
}: UseGovModalsParams) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<string>('');
  const [viewingDetail, setViewingDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<string>('');
  const [formFields, setFormFields] = useState<any>(createDefaultGovFormFields());
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setFormFields(createDefaultGovFormFields({
      objectives,
      programs,
      projectsData,
      indicators,
    }));
    setFormError('');
  };

  const openCreateModal = (type: string) => {
    setCreateType(type);
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openDetail = (item: any, type: string) => {
    setViewingDetail(item);
    setDetailType(type);
  };

  const closeDetail = () => {
    setViewingDetail(null);
  };

  return {
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
  };
}
