import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { DEFAULT_LICITA_FORM_FIELDS } from '../constants/defaultForms';
import { createLicitaRecord, initializeLicitaWorkspace, loadLicitaWorkspaceData } from '../services/LicitaWorkspaceService';
import type { LicitaCreateType, LicitaDetailType, LicitaFormFields } from '../types';

export const useLicitaWorkspaceController = (workspaceId: string) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorOnLoad, setErrorOnLoad] = useState<boolean>(false);
  const [initializingWorkspace, setInitializingWorkspace] = useState<boolean>(false);

  const [summary, setSummary] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [arps, setArps] = useState<any[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [complianceEvents, setComplianceEvents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [viewingDetail, setViewingDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<LicitaDetailType>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<LicitaCreateType>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formFields, setFormFields] = useState<LicitaFormFields>({ ...DEFAULT_LICITA_FORM_FIELDS });
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const buildAndLoadWorkspace = async () => {
    try {
      setLoading(true);
      setErrorOnLoad(false);
      setInitializingWorkspace(true);

      await initializeLicitaWorkspace(workspaceId);

      setInitializingWorkspace(false);

      const data = await loadLicitaWorkspaceData(workspaceId);

      setSummary(data.summary);
      setOpportunities(data.opportunities);
      setBids(data.bids);
      setSuppliers(data.suppliers);
      setContracts(data.contracts);
      setArps(data.arps);
      setComplianceSummary(data.complianceSummary);
      setAuditEvents(data.auditEvents);
      setComplianceEvents(data.complianceEvents);
      setReports(data.reports);
    } catch (err) {
      console.error('Error loading procurement workspace data:', err);
      setErrorOnLoad(true);
    } finally {
      setLoading(false);
      setInitializingWorkspace(false);
    }
  };

  useEffect(() => {
    buildAndLoadWorkspace();
  }, [workspaceId]);

  const resetForm = () => {
    setFormFields({ ...DEFAULT_LICITA_FORM_FIELDS });
    setEditingItem(null);
    setFormError('');
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      await createLicitaRecord(workspaceId, createType, formFields);
      setIsCreateModalOpen(false);
      resetForm();
      await buildAndLoadWorkspace();
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao salvar o registro.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      if (editingItem) {
        const updatedItem = {
          ...editingItem,
          title: formFields.title || editingItem.title,
          description: formFields.description || editingItem.description,
          status: formFields.status || editingItem.status,
          name: formFields.title || editingItem.name,
          documentNumber: formFields.documentNumber || editingItem.documentNumber,
          number: formFields.number || editingItem.number,
          value: formFields.value ? Number(formFields.value) : editingItem.value,
          supplierName: formFields.supplierName || editingItem.supplierName,
          metadata: {
            ...(editingItem.metadata || {}),
            number: formFields.number || editingItem.metadata?.number,
            modalidade: formFields.modalidade || editingItem.metadata?.modalidade,
            orgao: formFields.orgao || editingItem.metadata?.orgao || editingItem.metadata?.orgaoGerenciador,
            valorEstimado: formFields.valorEstimado ? Number(formFields.valorEstimado) : editingItem.metadata?.valorEstimado,
            supplierName: formFields.supplierName || editingItem.metadata?.supplierName,
            vigenciaDe: formFields.vigenciaDe || editingItem.metadata?.vigenciaDe,
            vigenciaAte: formFields.vigenciaAte || editingItem.metadata?.vigenciaAte,
            gestor: formFields.gestor || editingItem.metadata?.gestor
          }
        };

        if (createType === 'bid') {
          setBids(bids.map(b => b.id === editingItem.id ? updatedItem : b));
        } else if (createType === 'supplier') {
          setSuppliers(suppliers.map(s => s.id === editingItem.id ? updatedItem : s));
        } else if (createType === 'contract') {
          setContracts(contracts.map(c => c.id === editingItem.id ? updatedItem : c));
        } else if (createType === 'arp') {
          setArps(arps.map(a => a.id === editingItem.id ? updatedItem : a));
        }

        setIsEditModalOpen(false);
        resetForm();
      }
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao editar o registro.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openCreateModal = (type: LicitaCreateType) => {
    setCreateType(type);
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: any, type: LicitaCreateType) => {
    setCreateType(type);
    setEditingItem(item);
    setFormFields({
      title: item.title || item.name || '',
      description: item.description || '',
      status: item.status || 'ACTIVE',
      number: item.number || item.metadata?.number || '',
      modalidade: item.metadata?.modalidade || 'Pregão Eletrônico',
      orgao: item.metadata?.orgao || item.metadata?.orgaoGerenciador || 'Secretaria Municipal de Administração',
      valorEstimado: item.metadata?.valorEstimado || '',
      supplierName: item.supplierName || item.metadata?.supplierName || '',
      supplierId: item.supplierId || '',
      bidId: item.bidId || '',
      documentNumber: item.documentNumber || '',
      value: item.value || '',
      gestor: item.metadata?.gestor || '',
      vigenciaDe: item.metadata?.vigenciaDe || '',
      vigenciaAte: item.metadata?.vigenciaAte || '',
      origem: item.metadata?.origem || '',
      motivo: item.metadata?.motivo || '',
      grauRisco: item.metadata?.grauRisco || 'BAIXO'
    });
    setIsEditModalOpen(true);
  };

  return {
    loading,
    errorOnLoad,
    initializingWorkspace,
    summary,
    opportunities,
    bids,
    suppliers,
    contracts,
    arps,
    complianceSummary,
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
    editingItem,
    formFields,
    setFormFields,
    formError,
    formSubmitting,
    buildAndLoadWorkspace,
    handleCreateSubmit,
    handleEditSubmit,
    openCreateModal,
    openEditModal,
    resetForm,
  };
};
