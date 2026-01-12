import React from 'react';
import type { ViewType } from '@/components/types';
import { PcasLogo, DashboardIcon, UnitsIcon, ContractsIcon, ReportsIcon, ProvidersIcon, PaymentsIcon } from './Icons';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  logout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'unidades', label: 'Unidades', icon: <UnitsIcon /> },
  { id: 'contratos', label: 'Contratos', icon: <ContractsIcon /> },
  { id: 'pagos', label: 'Pagos', icon: <PaymentsIcon /> },
  { id: 'proveedores', label: 'Proveedores', icon: <ProvidersIcon /> },
  { id: 'empresas', label: 'Empresas', icon: <div className="text-xs font-bold border border-current rounded px-1">Co</div> },
  { id: 'reportes', label: 'Reportes', icon: <ReportsIcon /> },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, logout }) => {
  return (
    <aside className="sidebar w-64 bg-slate-800 text-white flex flex-col flex-shrink-0">
      <div className="flex items-center justify-center h-16 border-b border-slate-700 px-2">
        <PcasLogo />
        <div className="ml-2 flex flex-col">
          <span className="text-lg font-bold leading-tight">PCAS</span>
          <span className="text-[10px] text-slate-300 uppercase tracking-wider leading-tight">Fleet Management</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <a
              key={item.id}
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView(item.id); }}
              className={`flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-slate-700">
        <div className="flex items-center">
          <img className="h-10 w-10 rounded-full" src="https://picsum.photos/100" alt="Avatar de usuario" />
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Administrador</p>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
