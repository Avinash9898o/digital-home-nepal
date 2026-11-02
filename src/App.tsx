/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BillsView } from './components/BillsView';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { FinanceView } from './components/FinanceView';
import { Layout } from './components/Layout';
import { MaintenanceView } from './components/MaintenanceView';
import { OnboardingView } from './components/OnboardingView';
import { GlobalOverlays } from './components/QuickActionModals';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ShoppingView } from './components/ShoppingView';
import { TasksView } from './components/TasksView';
import { HomeProvider, useHome } from './context/HomeContext';

const DigitalHomeShell: React.FC = () => {
  const { data, activeSection } = useHome();

  if (!data.settings.hasCompletedOnboarding) {
    return (
      <>
        <OnboardingView />
        <GlobalOverlays />
      </>
    );
  }

  return (
    <>
      <Layout>
        {activeSection === 'dashboard' && <DashboardView />}
        {activeSection === 'finance' && <FinanceView />}
        {activeSection === 'bills' && <BillsView />}
        {activeSection === 'shopping' && <ShoppingView />}
        {activeSection === 'tasks' && <TasksView />}
        {activeSection === 'calendar' && <CalendarView />}
        {activeSection === 'maintenance' && <MaintenanceView />}
        {activeSection === 'reports' && <ReportsView />}
        {activeSection === 'settings' && <SettingsView />}
      </Layout>
      <GlobalOverlays />
    </>
  );
};

export default function App() {
  return (
    <HomeProvider>
      <DigitalHomeShell />
    </HomeProvider>
  );
}
