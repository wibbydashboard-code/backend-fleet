
import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Login } from '@/components/Login';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Dashboard from '@/components/Dashboard';
import { Units } from '@/components/Units';
import { ContractsView } from '@/components/ContractsView';
import { PaymentsView } from '@/components/PaymentsView';
import { ProvidersView } from '@/components/ProvidersView';
import { CompaniesView } from '@/components/CompaniesView';
import { Reports } from '@/components/Reports';
import { UnitDetailModal } from '@/components/UnitDetailModal';
import type { ViewType, Unit } from '@/components/types';
// import { UNITS } from '@/constants';

const viewTitles: Record<ViewType, string> = {
  dashboard: 'Dashboard General',
  unidades: 'Gestión de Unidades',
  contratos: 'Gestión de Contratos',
  pagos: 'Pagos',
  proveedores: 'Gestión de Proveedores',
  empresas: 'Gestión de Empresas',
  reportes: 'Reportes y Analíticas',
};

function AppContent() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const handleOpenModal = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUnit(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'unidades': return <Units onOpenModal={handleOpenModal} />;
      case 'contratos': return <ContractsView />;
      case 'pagos': return <PaymentsView />;
      case 'proveedores': return <ProvidersView />;
      case 'empresas': return <CompaniesView />;
      case 'reportes': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar activeView={activeView} setActiveView={setActiveView} logout={logout} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={viewTitles[activeView]} logout={logout} />
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
