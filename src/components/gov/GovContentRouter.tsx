import React from 'react';
import GovDashboard from './GovDashboard';
import GovPrograms from './GovPrograms';
import GovProjects from './GovProjects';
import GovActions from './GovActions';
import GovGoals from './GovGoals';
import GovIndicators from './GovIndicators';
import GovGovernance from './GovGovernance';
import GovReports from './GovReports';
import GovReviews from './GovReviews';
import GovResults from './GovResults';
import SearchToolbar from '../shared/forms/SearchToolbar';
import type { GovTab } from './constants/navigation';

interface GovContentRouterProps {
  currentTab: GovTab;
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  programs: any[];
  projectsData: any[];
  actions: any[];
  indicators: any[];
  goals: any[];
  results: any[];
  audits: any[];
  compliances: any[];
  monitorings: any[];
  occurrences: any[];
  briefs: any[];
  govReviews: any[];
  snapshots: any[];
  reports: any[];
  progSummary: any;
  perfSummary: any;
  filteredPrograms: any[];
  filteredProjects: any[];
  filteredActions: any[];
  filteredGoals: any[];
  setActiveTab: (tab: string) => void;
  getProgramName: (id: string) => string;
  getProjectName: (id: string) => string;
  getIndicatorName: (id: string) => string;
  formatStatus: (status: string) => string;
  onView: (item: any, type: string) => void;
}

/**
 * GovContentRouter
 *
 * Roteador visual oficial do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a área principal conforme a aba Gov;
 * - manter o GovWorkspace como orquestrador;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovContentRouter({
  currentTab,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
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
  govReviews,
  snapshots,
  reports,
  progSummary,
  perfSummary,
  filteredPrograms,
  filteredProjects,
  filteredActions,
  filteredGoals,
  setActiveTab,
  getProgramName,
  getProjectName,
  getIndicatorName,
  formatStatus,
  onView,
}: GovContentRouterProps) {
  const showSearchToolbar = ![
    'beta_gov',
    'gov_dashboard',
    'gov_governance',
    'gov_reviews',
    'gov_reports',
  ].includes(currentTab);

  return (
    <>
      {(currentTab === 'beta_gov' || currentTab === 'gov_dashboard') && (
        <GovDashboard
          loading={loading}
          programs={programs}
          projectsData={projectsData}
          actions={actions}
          indicators={indicators}
          goals={goals}
          results={results}
          reports={reports}
          progSummary={progSummary}
          perfSummary={perfSummary}
          setActiveTab={setActiveTab}
        />
      )}

      {showSearchToolbar && (
        <SearchToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}

      {currentTab === 'gov_programs' && (
        <GovPrograms
          loading={loading}
          programs={filteredPrograms}
          onView={(item) => onView(item, 'program')}
          formatStatus={formatStatus}
        />
      )}

      {currentTab === 'gov_projects' && (
        <GovProjects
          loading={loading}
          projects={filteredProjects}
          getProgramName={getProgramName}
          onView={(item) => onView(item, 'project')}
          formatStatus={formatStatus}
        />
      )}

      {currentTab === 'gov_actions' && (
        <GovActions
          loading={loading}
          actions={filteredActions}
          getProjectName={getProjectName}
          onView={(item) => onView(item, 'action')}
        />
      )}

      {currentTab === 'gov_indicators' && (
        <GovIndicators
          loading={loading}
          indicators={indicators}
          goals={goals}
          onView={(item) => onView(item, 'indicator')}
        />
      )}

      {currentTab === 'gov_goals' && (
        <GovGoals
          loading={loading}
          goals={filteredGoals}
          getIndicatorName={getIndicatorName}
          onView={(item) => onView(item, 'goal')}
        />
      )}

      {currentTab === 'gov_results' && (
        <GovResults
          loading={loading}
          results={results}
          goals={goals}
          getIndicatorName={getIndicatorName}
        />
      )}

      {currentTab === 'gov_governance' && (
        <GovGovernance
          loading={loading}
          audits={audits}
          compliances={compliances}
          monitorings={monitorings}
          occurrences={occurrences}
        />
      )}

      {currentTab === 'gov_reviews' && (
        <GovReviews
          loading={loading}
          briefs={briefs}
          govReviews={govReviews}
          snapshots={snapshots}
        />
      )}

      {currentTab === 'gov_reports' && (
        <GovReports
          loading={loading}
          reports={reports}
        />
      )}
    </>
  );
}
