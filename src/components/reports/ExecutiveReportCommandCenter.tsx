import React from 'react';
import type { ExecutiveReportSnapshot } from '../../core/reports/ExecutiveReportTypes';
import ExecutiveReportHeader from './ExecutiveReportHeader';
import ExecutiveReportScorecard from './ExecutiveReportScorecard';
import ExecutiveReportSections from './ExecutiveReportSections';
import ExecutiveReportAlerts from './ExecutiveReportAlerts';

export default function ExecutiveReportCommandCenter(props: { snapshot: ExecutiveReportSnapshot; existingTaskTitles: Set<string>; onCreateTask: (title: string) => Promise<void>; onNavigate: (tab: string) => void; }) {
  return <div className="space-y-5"><ExecutiveReportHeader snapshot={props.snapshot}/><ExecutiveReportScorecard snapshot={props.snapshot}/><ExecutiveReportSections sections={props.snapshot.sections}/><ExecutiveReportAlerts alerts={props.snapshot.alerts} existingTaskTitles={props.existingTaskTitles} onCreateTask={props.onCreateTask} onNavigate={props.onNavigate}/></div>;
}
