
import React from 'react';

interface HeaderProps {
  title: string;
  logout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, logout }) => {
  return (
    <header className="h-16 bg-white shadow-sm flex items-center px-6 flex-shrink-0 justify-between">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      {logout && (
        <button
          onClick={logout}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          Cerrar Sesión
        </button>
      )}
    </header>
  );
};
