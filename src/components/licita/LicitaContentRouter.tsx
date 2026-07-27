import React from 'react';
import type { LicitaCreateType, LicitaDetailType } from './types';
import ArpsView from './views/ArpsView';
import BidsView from './views/BidsView';
import ComplianceView from './views/ComplianceView';
import ContractsView from './views/ContractsView';
import DashboardView from './views/DashboardView';
import OpportunitiesView from './views/OpportunitiesView';
import ReportsView from './views/ReportsView';
import SuppliersView from './views/SuppliersView';

interface LicitaContentRouterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  opportunities: any[];
  bids: any[];
  suppliers: any[];
  contracts: any[];
  arps: any[];
  auditEvents: any[];
  complianceEvents: any[];
  reports: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
  openCreateModal: (type: LicitaCreateType) => void;
  openEditModal: (item: any, type: LicitaCreateType) => void;
}

export default function LicitaContentRouter({
  activeTab,
  setActiveTab,
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
  setViewingDetail,
  setDetailType,
  openCreateModal,
  openEditModal,
}: LicitaContentRouterProps) {
  if (activeTab === 'licita_dashboard') {
    return (
      <DashboardView
        opportunities={opportunities}
        bids={bids}
        suppliers={suppliers}
        contracts={contracts}
        arps={arps}
        reports={reports}
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'licita_opportunities') {
    return (
      <OpportunitiesView
        opportunities={opportunities}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
      />
    );
  }

  if (activeTab === 'licita_bids') {
    return (
      <BidsView
        bids={bids}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
      />
    );
  }

  if (activeTab === 'licita_suppliers') {
    return (
      <SuppliersView
        suppliers={suppliers}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
      />
    );
  }

  if (activeTab === 'licita_contracts') {
    return (
      <ContractsView
        contracts={contracts}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
      />
    );
  }

  if (activeTab === 'licita_arps') {
    return (
      <ArpsView
        arps={arps}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
      />
    );
  }

  if (activeTab === 'licita_compliance') {
    return (
      <ComplianceView
        auditEvents={auditEvents}
        complianceEvents={complianceEvents}
      />
    );
  }

  if (activeTab === 'licita_reports') {
    return (
      <ReportsView
        reports={reports}
        setViewingDetail={setViewingDetail}
        setDetailType={setDetailType}
      />
    );
  }

  return null;
}
