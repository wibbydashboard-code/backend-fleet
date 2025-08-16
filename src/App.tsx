
import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import Dashboard from '@/components/Dashboard';        // ⬅ default
import { Units } from '@/components/Units';
import { ContractsView } from '@/components/ContractsView';
import { Reports } from '@/components/Reports';
import { UnitDetailModal } from '@/components/UnitDetailModal';
import type { ViewType, Unit } from '@/types';
import { UNITS } from '@/constants';

const viewTitles: Record<ViewType, string> = {
  dashboard: 'Dashboard General',
  unidades:  'Gestión de Unidades',
  contratos: 'Gestión de Contratos',
  reportes:  'Reportes y Analíticas',
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const handleOpenModal = useCallback((unitId: number) => {
    const unit = UNITS.find(u => u.id === unitId);
    if (unit) { setSelectedUnit(unit); setIsModalOpen(true); }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'unidades':  return <Units onOpenModal={handleOpenModal} />;
      case 'contratos': return <ContractsView />;
      case 'reportes':  return <Reports />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={viewTitles[activeView]} />
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </main>
      {isModalOpen && selectedUnit && (
        <UnitDetailModal unit={selectedUnit} onClose={handleCloseModal} />
      )}
    </div>
  );
}
