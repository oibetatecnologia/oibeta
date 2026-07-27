import React from 'react';
import LicitaDashboard from '../components/LicitaDashboard';

interface DashboardViewProps {
  opportunities: any[];
  bids: any[];
  suppliers: any[];
  contracts: any[];
  arps: any[];
  reports: any[];
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({
  opportunities,
  bids,
  suppliers,
  contracts,
  arps,
  reports,
  setActiveTab,
}: DashboardViewProps) {
  return (
<LicitaDashboard
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
