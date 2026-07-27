import React from 'react';
import Sistema1Workspace from './Sistema1Workspace';
import Sistema5Workspace from './Sistema5Workspace';
import GovWorkspace from './GovWorkspace';
import LicitaWorkspace from './LicitaWorkspace';
import ElectoralWorkspace from './ElectoralWorkspace';
import CommercialRadarWorkspace from './workspaces/CommercialRadarWorkspace';
import { getProductWorkspaceKeyByTab } from '../products/productRegistry';

interface WorkspaceRouterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  selectedProjectId: string;
  projects: any[];
}

export default function WorkspaceRouter({ activeTab, setActiveTab, user, selectedProjectId, projects }: WorkspaceRouterProps) {
  const workspaceKey = getProductWorkspaceKeyByTab(activeTab);

  if (workspaceKey === 'gov') {
    return <GovWorkspace user={user} setActiveTab={setActiveTab} activeTab={activeTab} projects={projects} selectedProjectId={selectedProjectId} />;
  }

  if (workspaceKey === 'sistema1') {
    return <Sistema1Workspace user={user} setActiveTab={setActiveTab} activeTab={activeTab} selectedProjectId={selectedProjectId} />;
  }

  if (workspaceKey === 'sistema5') {
    return <Sistema5Workspace user={user} setActiveTab={setActiveTab} activeTab={activeTab} selectedProjectId={selectedProjectId} />;
  }

  if (workspaceKey === 'electoral') {
    return <ElectoralWorkspace user={user} setActiveTab={setActiveTab} activeTab={activeTab} />;
  }

  if (workspaceKey === 'commercial_radar') {
    return <CommercialRadarWorkspace />;
  }

  if (workspaceKey === 'licita') {
    return <LicitaWorkspace user={user} setActiveTab={setActiveTab} activeTab={activeTab} projects={projects} selectedProjectId={selectedProjectId} />;
  }

  // Fallback UI for remaining static tabs that have not been migrated yet.
  return null;
}
